/**
 * Scraper Queue Manager
 * Manages concurrent scraping requests to prevent conflicts
 * Processes requests one at a time in FIFO order
 */

class ScraperQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Add a scraping task to the queue
   * @param {Function} task - Async function to execute
   * @param {string} label - Label for logging
   * @returns {Promise} Resolves when task completes
   */
  async add(task, label = 'Scraping task') {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        label,
        resolve,
        reject,
        addedAt: new Date()
      });

      this.process();
    });
  }

  /**
   * Process queue items one at a time
   */
  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const { task, label, resolve, reject, addedAt } = this.queue.shift();
      
      const waitTime = new Date() - addedAt;
      console.log(`\n⏳ Processing queued task: ${label} (waited ${waitTime}ms)`);
      console.log(`📊 Queue remaining: ${this.queue.length} tasks`);

      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        console.error(`❌ Task failed: ${label}`, error);
        reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get current queue length
   * @returns {number}
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Check if currently processing
   * @returns {boolean}
   */
  isActive() {
    return this.isProcessing || this.queue.length > 0;
  }
}

// Create singleton instance
const scraperQueue = new ScraperQueue();

module.exports = scraperQueue;