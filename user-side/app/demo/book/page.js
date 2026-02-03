"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBranding } from "@/lib/useBranding";
import { useCachedQuery, CACHE_KEYS, CACHE_DURATIONS } from "@/lib/useCache";
import { ArrowLeft, Check, Users } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";

// Generate next 14 days (excluding Saturday and Sunday - no reservations on weekends)
const generateDates = () => {
  const dates = [];
  for (let i = 0; i < 23; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push({
      value: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  return dates;
};
// Time slots from 12 PM to 10 PM
const timeSlots = [
  { value: "12:00", label: "12 PM" },
  { value: "12:30", label: "12:30" },
  { value: "13:00", label: "1 PM" },
  { value: "13:30", label: "1:30" },
  { value: "14:00", label: "2 PM" },
  { value: "14:30", label: "2:30" },
  { value: "15:00", label: "3 PM" },
  { value: "15:30", label: "3:30" },
  { value: "16:00", label: "4 PM" },
  { value: "16:30", label: "4:30" },
  { value: "17:00", label: "5 PM" },
  { value: "17:30", label: "5:30" },
  { value: "18:00", label: "6 PM" },
  { value: "18:30", label: "6:30" },
  { value: "19:00", label: "7 PM" },
  { value: "19:30", label: "7:30" },
  { value: "20:00", label: "8 PM" },
  { value: "20:30", label: "8:30" },
  { value: "21:00", label: "9 PM" },
  { value: "21:30", label: "9:30" },
  { value: "22:00", label: "10 PM" },
  
];

const getTimeLabel = (value) => timeSlots.find(t => t.value === value)?.label || value;

const getDuration = (start, end) => {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const mins = (endH * 60 + endM) - (startH * 60 + startM);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) return `${hours}hr`;
  return `${hours}h ${remainingMins}m`;
};

// Table bubble component - clean, simple, size = capacity
const TableCard = ({ table, isSelected, onSelect, capacity }) => {
  // Size scales with capacity - bigger difference between sizes
  const size = capacity <= 2 ? 70 : capacity <= 4 ? 95 : capacity <= 6 ? 120 : 145;
  
  return (
    <button
      onClick={onSelect}
      className={`
        relative flex flex-col items-center justify-center
        rounded-full transition-all duration-300 ease-out border-2
        ${isSelected 
          ? 'bg-[--primary] border-[--primary-light] scale-110 z-20' 
          : 'bg-[--card] border-[--border] hover:border-[--primary]/50 active:scale-95'
        }
      `}
      style={{
        width: size,
        height: size,
        boxShadow: isSelected 
          ? '0 0 40px var(--primary-glow), 0 8px 24px rgba(0,0,0,0.4)' 
          : '0 4px 16px rgba(0,0,0,0.3)',
      }}
    >
      {/* Table number */}
      <span className={`
        font-bold leading-none
        ${isSelected ? 'text-[--bg]' : 'text-[--text-primary]'}
        ${capacity <= 2 ? 'text-lg' : capacity <= 4 ? 'text-2xl' : capacity <= 6 ? 'text-3xl' : 'text-4xl'}
      `}>
        {table.number}
      </span>
      
      {/* Capacity label */}
      <span className={`
        text-[10px] mt-1 font-medium
        ${isSelected ? 'text-[--bg]/70' : 'text-[--text-dim]'}
      `}>
        {capacity} seats
      </span>

      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-[--text-primary] rounded-full flex items-center justify-center shadow-lg z-30">
          <Check size={14} className="text-[--primary]" strokeWidth={3} />
        </div>
      )}
    </button>
  );
};

export default function BookTablePage() {
  const router = useRouter();
  const { brandName, brandLogo, isLoading: brandingLoading } = useBranding();
  const [step, setStep] = useState(1);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedTables, setSelectedTables] = useState([]); // For multi-table booking
  const [selectedDate, setSelectedDate] = useState(generateDates()[0].value);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [partySize, setPartySize] = useState(2);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // React Hook Form for customer details
  const { 
    register, 
    handleSubmit: handleFormSubmit, 
    formState: { errors },
    watch,
    getValues
  } = useForm({
    defaultValues: {
      customerName: "",
      countryCode: "+91",
      customerPhone: "",
      notes: "",
    }
  });

  // Deposit rate per seat
  const DEPOSIT_PER_PERSON = 200;

  const dates = generateDates();
  
  // Use cached query for tables
  const { data: tables, isLoading: tablesLoading } = useCachedQuery(
    api.tables.list,
    {},
    CACHE_KEYS.TABLES,
    {
      cacheDuration: CACHE_DURATIONS.LONG,
    }
  );
  
  const createReservation = useMutation(api.reservations.create);
  const reservations = useQuery(api.reservations.list, { date: selectedDate });

  const getTableReservations = (tableId) => {
    return reservations?.filter(r => r.tableId === tableId && r.status === "confirmed") || [];
  };

  // Razorpay payment handler
  const initiatePayment = (formData) => {
    const tablesToBook = needsMultipleTables ? selectedTables : [selectedTable];
    if (tablesToBook.length === 0) {
      setError("Please select a table");
      return;
    }

    setIsProcessing(true);
    setError("");

    // Combine country code with phone number
    const fullPhone = `${formData.countryCode}${formData.customerPhone}`;

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_yourkeyhere",
      amount: totalDeposit * 100, // Amount in paise
      currency: "INR",
      name: brandName,
      description: `Table Reservation Deposit - ${formatDate(selectedDate)}`,
      image: brandLogo,
      handler: async function (response) {
        // Payment successful - create reservation
        try {
          for (let i = 0; i < tablesToBook.length; i++) {
            const table = tablesToBook[i];
            await createReservation({
              tableId: table._id,
              customerName: formData.customerName,
              customerPhone: fullPhone,
              date: selectedDate,
              startTime: startTime,
              endTime: endTime,
              partySize: partySize,
              depositAmount: i === 0 ? totalDeposit : 0,
              notes: needsMultipleTables 
                ? `${formData.notes || ''} [Group booking: Tables ${selectedTables.map(t => t.number).join(', ')}] [Payment: ${response.razorpay_payment_id}]`.trim()
                : `${formData.notes || ''} [Payment: ${response.razorpay_payment_id}]`.trim(),
            });
          }
          
          // Store customer phone in localStorage for auto-login
          localStorage.setItem('customerPhone', fullPhone);
          localStorage.setItem('customerName', formData.customerName);
          
          setSuccess(true);
        } catch (err) {
          setError(err.message);
        }
        setIsProcessing(false);
      },
      prefill: {
        name: formData.customerName,
        contact: fullPhone,
      },
      theme: {
        color: "#d4af7d",
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on("payment.failed", function (response) {
      setError("Payment failed. Please try again.");
      setIsProcessing(false);
    });
    razorpay.open();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Get max capacity from all tables
  const maxTableCapacity = tables?.reduce((max, t) => Math.max(max, t.capacity || 4), 0) || 4;
  const needsMultipleTables = partySize > maxTableCapacity;

  // Calculate deposit based on selected table(s) capacity
  const totalTableCapacity = needsMultipleTables 
    ? selectedTables.reduce((sum, t) => sum + (t.capacity || 4), 0)
    : (selectedTable?.capacity || 4);
  const totalDeposit = totalTableCapacity * DEPOSIT_PER_PERSON;

  // For multi-table mode, show all available tables (no capacity filter)
  // For single table mode, filter by capacity
  const availableTables = tables?.filter(table => {
    // In multi-table mode, show all tables regardless of capacity
    if (!needsMultipleTables && table.capacity && partySize > table.capacity) return false;
    
    // Filter by time conflicts
    const tableRes = getTableReservations(table._id);
    return !tableRes.some(r => 
      (startTime >= r.startTime && startTime < r.endTime) ||
      (endTime > r.startTime && endTime <= r.endTime) ||
      (startTime <= r.startTime && endTime >= r.endTime)
    );
  }) || [];

  // Calculate total capacity of selected tables
  const totalSelectedCapacity = selectedTables.reduce((sum, t) => sum + (t.capacity || 4), 0);
  const hasEnoughCapacity = totalSelectedCapacity >= partySize;

  // Toggle table selection for multi-table mode
  const toggleTableSelection = (table) => {
    if (needsMultipleTables) {
      setSelectedTables(prev => {
        const exists = prev.find(t => t._id === table._id);
        if (exists) {
          return prev.filter(t => t._id !== table._id);
        }
        return [...prev, table];
      });
      setSelectedTable(null);
    } else {
      setSelectedTable(table);
      setSelectedTables([]);
    }
  };

  // Get effective selection for continue button
  const hasValidSelection = needsMultipleTables ? (selectedTables.length > 0 && hasEnoughCapacity) : selectedTable;

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="p-5 flex items-center justify-center opacity-0 animate-slide-down" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt={brandName} className="h-9 w-9 rounded-full object-contain" />
            <span className="text-[--text-dim] text-xs tracking-[0.15em] uppercase">{brandName}</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
          <div className="px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] mb-10 opacity-0 animate-bounce-in bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2" />
            Confirmed
          </div>
          <div className="text-center mb-10">
            <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-4 opacity-0 animate-fade-in" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>{formatDate(selectedDate)}</p>
            <div className="flex items-center gap-5">
              <span className="text-5xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-left" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>{getTimeLabel(startTime)}</span>
              <span className="text-[--text-dim] text-2xl opacity-0 animate-scale-in" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>→</span>
              <span className="text-5xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-right" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>{getTimeLabel(endTime)}</span>
            </div>
          </div>
          <div className="divider-glow w-24 mb-10 opacity-0 animate-expand" style={{animationDelay: '0.7s', animationFillMode: 'forwards'}} />
          <div className="text-center opacity-0 animate-slide-up" style={{animationDelay: '0.8s', animationFillMode: 'forwards'}}>
            <p className="text-[--text-primary] text-xl font-luxury">{getValues('customerName')}</p>
            <p className="text-[--text-muted] text-sm mt-1">
              {needsMultipleTables 
                ? `Tables ${selectedTables.map(t => t.number).join(', ')} • ${partySize} guests`
                : `${selectedTable?.name} • ${partySize} guest${partySize !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          {/* Deposit credit info */}
          <div className="mt-8 px-5 py-3 rounded-xl bg-[--primary]/10 border border-[--primary]/20 opacity-0 animate-slide-up" style={{animationDelay: '0.9s', animationFillMode: 'forwards'}}>
            <p className="text-[--primary] text-sm font-medium text-center">₹{totalDeposit} credit on your bill</p>
          </div>
        </div>
        <div className="p-6">
          <Link href="/" className="btn-primary w-full py-4 rounded-xl text-sm font-medium opacity-0 animate-slide-up block text-center" style={{animationDelay: '1s', animationFillMode: 'forwards'}}>Done</Link>
        </div>
      </div>
    );
  }

  // Show loading while branding loads
  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg]">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Razorpay Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <div className="p-4 flex items-center justify-between">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} className="text-[--text-muted]" />
        </button>
        <div className="flex items-center gap-3">
          <img src={brandLogo} alt={brandName} className="h-8 w-8 rounded-full object-contain" />
          <span className="text-[--text-dim] text-xs tracking-[0.15em] uppercase">Book</span>
        </div>
        <div className="w-8" />
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 rounded-full transition-all ${step >= s ? 'bg-[--primary] w-8' : 'bg-[--border] w-2'}`} />
        ))}
      </div>

      {error && (
        <div className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs text-center">{error}</p>
        </div>
      )}

      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 px-4 overflow-y-auto">
            <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-1 text-center">Select Date</p>
            <p className="text-[--text-dim] text-[9px] mb-3 text-center">Weekdays only • No reservations on weekends</p>
            <div className="overflow-x-auto pb-4 justify-center mb-6 scrollbar-hide -mx-4 px-4">
              <div className="flex justify-center gap-2 w-max">
                {dates.map(d => (
                  <button key={d.value} onClick={() => setSelectedDate(d.value)} className={`flex-shrink-0 w-16 py-3 justify-center rounded-xl text-center transition-all ${selectedDate === d.value ? 'bg-[--primary] text-white' : 'bg-[--card] border border-[--border] text-[--text-muted]'}`}>
                    <p className="text-[10px] uppercase">{d.day}</p>
                    <p className="text-2xl font-semibold my-1">{d.dateNum}</p>
                    <p className="text-[10px] uppercase">{d.month}</p>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-3 text-center">Start Time</p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {timeSlots.slice(0, -2).map(slot => (
                <button key={`start-${slot.value}`} onClick={() => { const idx = timeSlots.findIndex(t => t.value === slot.value); setStartTime(slot.value); setEndTime(timeSlots[Math.min(idx + 4, timeSlots.length - 1)].value); }} className={`px-4 py-2.5 rounded-lg text-sm transition-all ${startTime === slot.value ? 'bg-[--primary] text-white' : 'bg-[--card] border border-[--border] text-[--text-muted]'}`}>
                  {slot.label}
                </button>
              ))}
            </div>

            <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-3 text-center">End Time</p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {timeSlots.filter(t => t.value > startTime).map(slot => (
                <button key={`end-${slot.value}`} onClick={() => setEndTime(slot.value)} className={`px-4 py-2.5 rounded-lg text-sm transition-all ${endTime === slot.value ? 'bg-[--primary] text-white' : 'bg-[--card] border border-[--border] text-[--text-muted]'}`}>
                  {slot.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-[--border] bg-[--bg]">
            <div className="text-center mb-3">
              <span className="text-[--text-primary] font-semibold">{getTimeLabel(startTime)}</span>
              <span className="text-[--text-dim] mx-2">→</span>
              <span className="text-[--text-primary] font-semibold">{getTimeLabel(endTime)}</span>
              <span className="text-[--text-muted] ml-2">({getDuration(startTime, endTime)})</span>
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full py-4 rounded-xl text-sm font-medium">Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 px-4 overflow-y-auto pb-40">
            {/* Guest counter - prominent, easy to adjust */}
            <div className="bg-[--card] rounded-2xl p-5 mb-6 border border-[--border]">
              <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.2em] mb-3 text-center font-medium">Party Size</p>
              <div className="flex items-center justify-center gap-5">
                <button 
                  onClick={() => setPartySize(Math.max(1, partySize - 1))} 
                  className="w-12 h-12 rounded-full bg-[--bg-elevated] border border-[--border] flex items-center justify-center text-[--text-muted] active:scale-90 active:bg-[--card-hover] text-xl font-medium transition-all"
                >
                  −
                </button>
                <div className="flex items-center gap-2 min-w-[80px] justify-center">
                  <span className="text-5xl font-bold text-[--text-primary] tabular-nums">{partySize}</span>
                  <Users size={20} className="text-[--text-dim]" />
                </div>
                <button 
                  onClick={() => setPartySize(partySize + 1)} 
                  className="w-12 h-12 rounded-full bg-[--bg-elevated] border border-[--border] flex items-center justify-center text-[--text-muted] active:scale-90 active:bg-[--card-hover] text-xl font-medium transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {/* Floor plan header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.2em] font-medium">
                  {needsMultipleTables ? 'Select Multiple Tables' : 'Select Your Table'}
                </p>
                {needsMultipleTables && (
                  <p className="text-[--primary] text-[10px] mt-1">
                    Large party — select tables totaling {formData.partySize}+ seats
                  </p>
                )}
              </div>
              <p className="text-[--text-muted] text-[10px]">{availableTables.length} available</p>
            </div>

            {/* Table floor plan */}
            {availableTables.length === 0 ? (
              <div className="bg-[--card] rounded-2xl p-10 text-center border border-[--border]">
                <div className="w-16 h-16 rounded-full bg-[--bg-elevated] flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-[--text-dim]" />
                </div>
                <p className="text-[--text-secondary] font-medium mb-1">No tables available</p>
                <p className="text-[--text-muted] text-sm">Try a different party size or time</p>
              </div>
            ) : (
              <div className="bg-[--card] rounded-2xl p-5 border border-[--border]">
                {/* Multi-table capacity indicator */}
                {needsMultipleTables && selectedTables.length > 0 && (
                  <div className={`mb-4 p-3 rounded-xl text-center text-sm ${hasEnoughCapacity ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[--primary]/10 text-[--primary] border border-[--primary]/20'}`}>
                    {totalSelectedCapacity} / {partySize} seats selected
                    {hasEnoughCapacity && ' ✓'}
                  </div>
                )}
                
                {/* Bubble cluster layout */}
                <div className="flex flex-wrap justify-center items-center gap-3">
                  {availableTables.map(table => {
                    const capacity = table.capacity || 4;
                    const isSelected = needsMultipleTables 
                      ? selectedTables.some(t => t._id === table._id)
                      : selectedTable?._id === table._id;
                    return (
                      <TableCard
                        key={table._id}
                        table={table}
                        capacity={capacity}
                        isSelected={isSelected}
                        onSelect={() => toggleTableSelection(table)}
                      />
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-[--border]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[--card-hover]" />
                    <span className="text-[--text-dim] text-[10px] uppercase tracking-wide">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[--primary]" />
                    <span className="text-[--text-dim] text-[10px] uppercase tracking-wide">Selected</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom bar - fixed at bottom */}
          <div className="fixed z-50 bottom-0 left-0 right-0 p-4 border-t border-[--border] bg-[--bg]/95 backdrop-blur-lg">
            {needsMultipleTables ? (
              // Multi-table mode
              selectedTables.length > 0 ? (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedTables.map(t => (
                      <div key={t._id} className="px-3 py-1.5 rounded-lg bg-[--primary] text-[--bg] text-sm font-medium">
                        #{t.number}
                      </div>
                    ))}
                  </div>
                  <p className="text-[--text-muted] text-xs">
                    {selectedTables.length} tables • {totalSelectedCapacity} seats for {partySize} guests
                  </p>
                </div>
              ) : (
                <p className="text-[--text-muted] text-sm text-center mb-3">Select tables for your party</p>
              )
            ) : (
              // Single table mode
              selectedTable ? (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[--primary] flex items-center justify-center">
                      <span className="text-[--bg] font-bold">{selectedTable.number}</span>
                    </div>
                    <div>
                      <p className="text-[--text-primary] font-medium text-sm">{selectedTable.name}</p>
                      <p className="text-[--text-muted] text-xs">{selectedTable.capacity || 4} seats</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[--text-secondary] text-xs">{partySize} guest{partySize !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[--text-muted] text-sm text-center mb-3">Tap a table to select</p>
              )
            )}
            <button 
              onClick={() => hasValidSelection && setStep(3)} 
              disabled={!hasValidSelection} 
              className="btn-primary w-full py-4 rounded-xl text-sm font-semibold"
            >
              {needsMultipleTables && !hasEnoughCapacity && selectedTables.length > 0 
                ? `Need ${partySize - totalSelectedCapacity} more seats` 
                : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 px-4 overflow-y-auto pb-6">
            <div className="text-center mb-6">
              <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-2">{formatDate(selectedDate)}</p>
              <p className="text-3xl font-luxury font-semibold text-[--text-primary]">{getTimeLabel(startTime)} → {getTimeLabel(endTime)}</p>
              <p className="text-[--text-muted] text-xs mt-1">
                {needsMultipleTables 
                  ? `Tables ${selectedTables.map(t => t.number).join(', ')} • ${partySize} guests`
                  : `${selectedTable?.name} • ${partySize} guest${partySize !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            
            {/* Deposit info card */}
            <div className="bg-[--card] border border-[--border] rounded-2xl overflow-hidden mb-6">
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[--text-secondary] text-sm">Reservation Deposit</span>
                  <span className="text-[--text-primary] font-bold text-xl">₹{totalDeposit}</span>
                </div>
                <p className="text-[--text-dim] text-xs">
                  ₹{DEPOSIT_PER_PERSON} × {totalTableCapacity} seats
                </p>
              </div>
              
              {/* Big noticeable refund banner */}
              <div className="bg-emerald-500/15 border-t border-emerald-500/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 text-lg">↩</span>
                  </div>
                  <div>
                    <p className="text-emerald-400 font-semibold text-sm">100% Redeemable!</p>
                    <p className="text-emerald-400/80 text-xs mt-0.5">
                      This amount will be deducted from your food & drinks bill. You're not losing anything!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="divider-glow w-24 mx-auto mb-6" />
            
            <form onSubmit={handleFormSubmit(initiatePayment)} className="space-y-4">
              <div>
                <label className="text-[10px] text-[--text-dim] uppercase tracking-wider mb-2 block">Name *</label>
                <input 
                  type="text" 
                  {...register("customerName", { 
                    required: "Name is required",
                    minLength: { value: 2, message: "Name must be at least 2 characters" },
                    pattern: { value: /^[a-zA-Z\s]+$/, message: "Name can only contain letters" }
                  })} 
                  placeholder="Your name" 
                  className={`w-full bg-[--card] border rounded-xl px-4 py-3.5 text-sm ${errors.customerName ? 'border-red-500' : 'border-[--border]'}`} 
                />
                {errors.customerName && (
                  <p className="text-red-400 text-[10px] mt-1">{errors.customerName.message}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] text-[--text-dim] uppercase tracking-wider mb-2 block">Phone *</label>
                <div className="flex gap-2">
                  {/* Country Code */}
                  <select 
                    {...register("countryCode")}
                    className="bg-[--card] border border-[--border] rounded-xl px-3 py-3.5 text-sm w-24"
                  >
                    <option value="+91">🇮🇳 +91</option>
                   
                  </select>
                  {/* Phone Number - only digits */}
                  <input 
                    type="tel"
                    inputMode="numeric"
                    {...register("customerPhone", { 
                      required: "Phone number is required",
                      pattern: { 
                        value: /^\d{10}$/, 
                        message: "Enter exactly 10 digits" 
                      },
                      onChange: (e) => {
                        // Only allow digits
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      }
                    })} 
                    placeholder="10 digit number" 
                    maxLength={10}
                    className={`flex-1 bg-[--card] border rounded-xl px-4 py-3.5 text-sm ${errors.customerPhone ? 'border-red-500' : 'border-[--border]'}`} 
                  />
                </div>
                {errors.customerPhone && (
                  <p className="text-red-400 text-[10px] mt-1">{errors.customerPhone.message}</p>
                )}
                <p className="text-[--text-dim] text-[10px] mt-1.5">Used to create your account & track your deposit</p>
              </div>
              <div>
                <label className="text-[10px] text-[--text-dim] uppercase tracking-wider mb-2 block">Notes</label>
                <textarea 
                  {...register("notes")} 
                  placeholder="Special requests" 
                  rows={2} 
                  className="w-full bg-[--card] border border-[--border] rounded-xl px-4 py-3.5 text-sm resize-none" 
                />
              </div>
            </form>
          </div>
          <div className="p-4 border-t border-[--border] bg-[--bg]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[--text-muted] text-sm">Total to pay now</span>
              <span className="text-[--text-primary] font-bold text-xl">₹{totalDeposit}</span>
            </div>
            <button 
              onClick={handleFormSubmit(initiatePayment)} 
              disabled={isProcessing}
              className={`w-full py-4 rounded-xl text-sm font-medium transition-all ${
                isProcessing 
                  ? 'bg-[--border] text-[--text-dim] cursor-not-allowed' 
                  : 'btn-primary'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="loader !w-4 !h-4 !border-2" />
                  Processing...
                </span>
              ) : (
                'Pay & Confirm Booking'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
