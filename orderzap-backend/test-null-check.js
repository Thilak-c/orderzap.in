// Test null checking behavior
const order = {
  id: '123',
  cancellation_reason: null,
  notes: undefined,
  customer_name: 'John'
};

const convexData = {};

// Test 1: Using != null
if (order.cancellation_reason != null) {
  convexData.cancellationReason = order.cancellation_reason;
  console.log('Added cancellationReason (should NOT happen)');
} else {
  console.log('Skipped cancellationReason (correct)');
}

// Test 2: Using !== null && !== undefined
if (order.notes !== null && order.notes !== undefined) {
  convexData.notes = order.notes;
  console.log('Added notes (should NOT happen)');
} else {
  console.log('Skipped notes (correct)');
}

// Test 3: Check what's in convexData
console.log('convexData keys:', Object.keys(convexData));
console.log('Has cancellationReason:', 'cancellationReason' in convexData);
console.log('convexData:', JSON.stringify(convexData));
