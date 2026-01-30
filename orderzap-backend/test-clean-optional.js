// Test cleanOptional function
function cleanOptional(value) {
  return value === null || value === undefined ? undefined : value;
}

const testData = {
  id: '123',
  cancellationReason: cleanOptional(null),
  notes: cleanOptional(undefined),
  customerName: cleanOptional('John'),
};

console.log('Before cleanup:', testData);
console.log('Has cancellationReason:', 'cancellationReason' in testData);
console.log('cancellationReason value:', testData.cancellationReason);

// Remove undefined
Object.keys(testData).forEach(key => {
  if (testData[key] === undefined) {
    delete testData[key];
  }
});

console.log('\nAfter cleanup:', testData);
console.log('Has cancellationReason:', 'cancellationReason' in testData);
console.log('Keys:', Object.keys(testData));
