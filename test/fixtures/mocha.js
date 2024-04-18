beforeEach(function () {
  // Most of our tests perform multiple AJAX requests,
  // so we need to increase the timeouts to allow for that
  this.currentTest.timeout(20000);
  this.currentTest.slow(10000);
});
