class SseBroker {
  constructor() {
    this.clients = new Map();
    this.orderClients = new Map();
  }

  addClient(id, res) {
    this.clients.set(id, res);
  }

  removeClient(id) {
    this.clients.delete(id);
  }

  addOrderClient(orderId, res) {
    if (!this.orderClients.has(orderId)) {
      this.orderClients.set(orderId, new Set());
    }
    this.orderClients.get(orderId).add(res);
  }

  removeOrderClient(orderId, res) {
    const clients = this.orderClients.get(orderId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        this.orderClients.delete(orderId);
      }
    }
  }

  broadcast(eventName, data) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, res] of this.clients.entries()) {
      try {
        res.write(payload);
      } catch {
        this.removeClient(id);
      }
    }
  }

  sendToOrder(orderId, eventName, data) {
    const clients = this.orderClients.get(orderId);
    if (!clients || clients.size === 0) return;

    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of Array.from(clients)) {
      try {
        res.write(payload);
      } catch {
        this.removeOrderClient(orderId, res);
        continue;
      }

      if (eventName === 'order_completed') {
        try {
          res.end();
        } catch {
          // ignore
        }
        this.removeOrderClient(orderId, res);
      }
    }
  }

  clear() {
    this.clients.clear();
    this.orderClients.clear();
  }

  getClientsCount() {
    return this.clients.size;
  }
}

const sseBroker = new SseBroker();

export { SseBroker, sseBroker };
export default sseBroker;
