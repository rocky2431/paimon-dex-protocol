// Jest setup for BigInt serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
