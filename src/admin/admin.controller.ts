import { All, Controller, Inject, Next, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Roles } from '@thallesp/nestjs-better-auth';
import type { NextFunction, Request, Response, Router } from 'express';

import { ADMIN_ROUTER } from './admin.router';

/** AdminJS sur /admin : le guard global de nestjs-better-auth exige une session et le rôle admin */
@ApiExcludeController()
@Roles(['admin'])
@Controller('admin')
export class AdminController {
  constructor(@Inject(ADMIN_ROUTER) private readonly adminRouter: Router) {}

  @All(['', '*path'])
  handle(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    // Corps JSON ou formulaire déjà lu par les parsers du module d'auth : on le passe à AdminJS
    // comme l'aurait fait express-formidable, qui attendrait sinon sans fin un flux déjà consommé
    if (req.readableEnded) {
      Object.assign(req, {
        fields: (req.body as unknown) ?? {},
        files: {},
        express_formidable: { parsed: true },
      });
    }
    this.adminRouter(req, res, next);
  }
}
