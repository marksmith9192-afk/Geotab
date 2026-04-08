export class InMemoryJobQueue {
  private chain = Promise.resolve();

  enqueue(task: () => Promise<void>): void {
    this.chain = this.chain.then(task).catch(() => undefined);
  }
}
