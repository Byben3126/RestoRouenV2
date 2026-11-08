import { All, Controller, Inject, Next, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Roles } from '@thallesp/nestjs-better-auth';
import type { NextFunction, Request, Response, Router } from 'express';

import { QUEUE_BOARD_ROUTER } from './queue-board.router';

/** Bull Board sur /dev/queues : le guard global de nestjs-better-auth exige une session et le rôle dev */
@ApiExcludeController()
@Roles(['dev'])
@Controller('dev/queues')
export class DevController {
  constructor(@Inject(QUEUE_BOARD_ROUTER) private readonly queueBoard: Router) {}

  @All(['', '*path'])
  handle(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.queueBoard(req, res, next);
  }
}
