class SseBroker {
  constructor() {
    this.clients = new Map();
  }

  addClient(id, res) {
    this.clients.set(id, res);
  }

  removeClient(id) {
    this.clients.delete(id);
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

  clear() {
    this.clients.clear();
  }

  getClientsCount() {
    return this.clients.size;
  }
}

const sseBroker = new SseBroker();

export { SseBroker, sseBroker };
export default sseBroker;
