import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  afterInit() {
    this.logger.log('🚀 WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_student')
  handleJoinStudent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { studentId: string },
  ) {
    if (data?.studentId) {
      const room = `student_${data.studentId}`;
      client.join(room);
      this.logger.log(`👤 Client [${client.id}] joined room: ${room}`);
      return { status: 'joined', room };
    }
  }

  @SubscribeMessage('join_section')
  handleJoinSection(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sectionId: string },
  ) {
    if (data?.sectionId) {
      const room = `section_${data.sectionId}`;
      client.join(room);
      this.logger.log(`📚 Client [${client.id}] joined room: ${room}`);
      return { status: 'joined', room };
    }
  }

  @SubscribeMessage('leave_section')
  handleLeaveSection(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sectionId: string },
  ) {
    if (data?.sectionId) {
      const room = `section_${data.sectionId}`;
      client.leave(room);
      this.logger.log(`🚪 Client [${client.id}] left room: ${room}`);
      return { status: 'left', room };
    }
  }

  // Helper method to send notification to a specific student
  sendToStudent(studentId: string, event: string, payload: any) {
    const room = `student_${studentId}`;
    this.server.to(room).emit(event, payload);
    this.logger.log(`📡 Real-time event [${event}] sent to room [${room}]`);
  }

  // Helper method to send seat count updates to a section room
  sendToSection(sectionId: string, event: string, payload: any) {
    const room = `section_${sectionId}`;
    this.server.to(room).emit(event, payload);
    this.logger.log(`📡 Real-time event [${event}] sent to room [${room}]`);
  }

  // Helper method to broadcast to all connected clients
  broadcast(event: string, payload: any) {
    this.server.emit(event, payload);
  }
}
