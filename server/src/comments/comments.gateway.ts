import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class CommentsGateway {
  @WebSocketServer()
  server: Server;

  emitCommentCreated(comment: unknown) {
    this.server.emit('commentCreated', comment);
  }
}