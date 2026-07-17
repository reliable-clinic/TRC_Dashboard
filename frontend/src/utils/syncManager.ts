export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

type SyncCallback = (queueLength: number, isOnline: boolean) => void;

class SyncManager {
  private queueKey = 'trc_offline_queue';
  private subscribers: Set<SyncCallback> = new Set();
  private isProcessing = false;
  private checkInterval: any = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;
    
    // Register window online event
    window.addEventListener('online', () => {
      console.log('App back online. Triggering synchronization...');
      this.syncQueue();
    });

    // Background interval to periodically check and sync (every 10 seconds)
    this.checkInterval = setInterval(() => {
      this.syncQueue();
    }, 10000);
  }

  public subscribe(cb: SyncCallback) {
    this.subscribers.add(cb);
    cb(this.getQueueLength(), this.isNetworkOnline());
  }

  public unsubscribe(cb: SyncCallback) {
    this.subscribers.delete(cb);
  }

  private notify() {
    const len = this.getQueueLength();
    const online = this.isNetworkOnline();
    this.subscribers.forEach(cb => cb(len, online));
  }

  private isNetworkOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  public getQueueLength(): number {
    return this.getQueue().length;
  }

  public getQueue(): QueuedRequest[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.queueKey);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing offline queue:', e);
      return [];
    }
  }

  private saveQueue(queue: QueuedRequest[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.queueKey, JSON.stringify(queue));
    this.notify();
  }

  public async execute(url: string, options: RequestInit = {}): Promise<{ ok: boolean; data?: any; offline?: boolean }> {
    const method = options.method || 'GET';
    
    // For read operations, execute normally without caching
    if (method === 'GET') {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        return { ok: true, data };
      } catch (e) {
        return { ok: false };
      }
    }

    // For write operations (POST, PUT, DELETE)
    try {
      // Check if online before sending
      if (!this.isNetworkOnline()) {
        throw new Error('Offline (network check)');
      }

      const res = await fetch(url, options);
      if (!res.ok) {
        // If server returned structured error (e.g. 500), let's not queue to avoid loop errors
        // Queue only network errors or temporary server down (502, 503, 504)
        if (res.status >= 500 && res.status !== 500) { // server down/bad gateway
          throw new Error(`Server temporarily unavailable: ${res.status}`);
        }
        const errText = await res.text();
        console.error('API Error details:', errText);
        return { ok: false };
      }
      
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        // Response might be empty or plain text success
      }
      return { ok: true, data };

    } catch (e) {
      console.warn(`Write request failed, caching to offline queue: ${method} ${url}`, e);
      
      // Store in queue
      const req: QueuedRequest = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(),
        url,
        method,
        headers: (options.headers as Record<string, string>) || { 'Content-Type': 'application/json' },
        body: typeof options.body === 'string' ? options.body : '',
        timestamp: Date.now()
      };

      const queue = this.getQueue();
      queue.push(req);
      this.saveQueue(queue);

      return { ok: true, offline: true };
    }
  }

  public async syncQueue() {
    if (this.isProcessing) return;
    const queue = this.getQueue();
    if (queue.length === 0) {
      this.notify();
      return;
    }

    // Double check connection using a quick ping
    try {
      const ping = await fetch('http://localhost:5000/api/dashboard/stats');
      if (!ping.ok) {
        this.notify();
        return; // server exists but returned error or database is down
      }
    } catch (e) {
      console.log('Ping failed. Server still offline.');
      this.notify();
      return; // backend is down
    }

    this.isProcessing = true;
    console.log(`Synchronizing ${queue.length} pending offline transactions...`);

    const remainingQueue: QueuedRequest[] = [...queue];

    for (const req of queue) {
      try {
        console.log(`Syncing request: ${req.method} ${req.url}`);
        const res = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body || undefined
        });

        if (res.ok) {
          // Remove from local array
          const index = remainingQueue.findIndex(item => item.id === req.id);
          if (index > -1) remainingQueue.splice(index, 1);
          this.saveQueue(remainingQueue);
          console.log(`Sync succeeded for ID ${req.id}`);
        } else {
          // If server rejects request because of data error (e.g. duplicate key), skip it to avoid getting stuck
          if (res.status === 400 || res.status === 422 || res.status === 500) {
            console.error(`Skipping invalid transaction ${req.id} due to API refusal: ${res.status}`);
            const index = remainingQueue.findIndex(item => item.id === req.id);
            if (index > -1) remainingQueue.splice(index, 1);
            this.saveQueue(remainingQueue);
          } else {
            console.warn(`Sync failed for ID ${req.id} (HTTP ${res.status}), stopping replay loop.`);
            break; // Temporary failure, retry later
          }
        }
      } catch (e) {
        console.error(`Network error during sync of ID ${req.id}`, e);
        break; // Network dropped again, stop loop
      }
    }

    this.isProcessing = false;
    this.notify();
  }
}

export const syncManager = new SyncManager();
