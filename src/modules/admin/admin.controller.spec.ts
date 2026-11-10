import type { NextFunction, Request, Response, Router } from 'express';

import { AdminController } from './admin.controller';

describe('AdminController', () => {
  let controller: AdminController;
  let adminRouter: jest.Mock;
  const res = {} as Response;
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    adminRouter = jest.fn();
    controller = new AdminController(adminRouter as unknown as Router);
  });

  it('hands the request to the AdminJS router', () => {
    const req = { url: '/admin/resources/User', readableEnded: false } as Request;

    controller.handle(req, res, next);

    expect(adminRouter).toHaveBeenCalledWith(req, res, next);
  });

  it('hands a body already read by the auth module parsers to AdminJS, like express-formidable', () => {
    const req = { url: '/admin/api', readableEnded: true, body: { name: 'x' } } as Request;

    controller.handle(req, res, next);

    expect(req).toMatchObject({
      fields: { name: 'x' },
      files: {},
      express_formidable: { parsed: true },
    });
  });

  it('lets AdminJS read a body that is still unread (multipart forms)', () => {
    const req = { url: '/admin/api', readableEnded: false } as Request;

    controller.handle(req, res, next);

    expect(req).not.toHaveProperty('express_formidable');
  });
});
