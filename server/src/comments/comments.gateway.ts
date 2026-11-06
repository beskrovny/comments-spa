import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['https://beskrovny.github.io', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
})
export class CommentsGateway {
  @WebSocketServer()
  server: Server;

  emitCommentCreated(comment: unknown) {
    this.server.emit('commentCreated', comment);
  }
}