import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect() {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket server...');
    
    this.socket = io('http://localhost:8000', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join the main room for updates
      this.socket?.emit('join-room', 'main');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.attemptReconnect();
    });

    // Listen for negotiation updates
    this.socket.on('negotiation-update', (data) => {
      console.log('Received negotiation update:', data);
      this.handleNegotiationUpdate(data);
    });

    // Listen for scheduling updates
    this.socket.on('scheduling-update', (data) => {
      console.log('Received scheduling update:', data);
      this.handleSchedulingUpdate(data);
    });

    // Listen for generic messages (from Python backend)
    this.socket.on('message', (data) => {
      console.log('Received WebSocket message:', data);
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        this.handleNegotiationUpdate(parsedData);
      } catch (e) {
        console.log('Non-JSON WebSocket message:', data);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleNegotiationUpdate(data: any) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('negotiation-update', { 
      detail: data 
    }));
  }

  private handleSchedulingUpdate(data: any) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('scheduling-update', { 
      detail: data 
    }));
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Method to emit events to server
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }

  // Method to listen to specific events
  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Method to remove event listeners
  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }
}

export const websocketService = new WebSocketService();
