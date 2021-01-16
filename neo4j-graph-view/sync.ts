// Ensures synchronous execution of queries to prevent problems with race conditions on Neo4j.
// Problem: Is it thread-safe? Probably right, because js is single-threaded?
export class SyncQueue {
    callbackQueue: [((...data: any) => Promise<any>), any[]][];
    activeCallback: (...data: any) => Promise<any>;
    toBind: any;

    constructor(toBind: any) {
      this.callbackQueue = [];
      this.activeCallback = null;
      this.toBind = toBind;
    }

    public async execute(callback: (...data: any) => Promise<any>, ...data: any[]) {
      this.callbackQueue.push([callback, data]);
      if (this.callbackQueue.length === 1 && this.activeCallback === null) {
        // On empty queue, make active and assume responsibility of handling the queue.
        while (this.callbackQueue.length > 0) {
          const nextEvent = this.callbackQueue.shift();
          this.activeCallback = nextEvent[0];
          console.log('starting callback');
          await this.activeCallback.call(this.toBind, ...nextEvent[1]);
          console.log('ending callback');
        }
        this.activeCallback = null;
        console.log('exiting execute');
      }
    }
}
