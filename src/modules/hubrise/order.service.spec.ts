import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import {
  CUSTOMER_POINTS_ADDED_EVENT,
  CustomerPointsAddedEvent,
} from '../customer/events/customer-points-added.event';
import { AppUser } from '../user/entities/app-user.entity';
import { Order } from './entities';
import { OrderService } from './order.service';

const ORDER_ID = 'order-1';
const EMAIL = 'jane@test.com';

describe('OrderService', () => {
  let service: OrderService;
  let token: string;
  const jwtService = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '10m' } });
  const orderRepository = { claimForUser: jest.fn(), claimForEmail: jest.fn() };
  const appUserRepository = { findOne: jest.fn() };
  const eventEmitter = { emit: jest.fn() };
  const transaction = {
    amount: 50,
    reason: 'Commande 42',
    customer: { points: 120, restaurant: { id: 'resto-1' } },
  };

  beforeAll(async () => {
    token = await jwtService.signAsync({ orderId: ORDER_ID });
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        { provide: getRepositoryToken(AppUser), useValue: appUserRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();
    service = module.get(OrderService);
  });

  const invalidTokens: [string, () => Promise<string>][] = [
    [
      'signed with another secret',
      () => new JwtService({ secret: 'other-secret' }).signAsync({ orderId: ORDER_ID }),
    ],
    ['expired', () => jwtService.signAsync({ orderId: ORDER_ID }, { expiresIn: '-1s' })],
    ['malformed', () => Promise.resolve('not-a-jwt')],
  ];

  describe('claimPoints', () => {
    it('credits the order of the token to the user and notifies them', async () => {
      orderRepository.claimForUser.mockResolvedValue(transaction);

      await expect(service.claimPoints(token, 'user-1')).resolves.toEqual({ points: 50 });

      expect(orderRepository.claimForUser).toHaveBeenCalledWith(ORDER_ID, 'user-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CUSTOMER_POINTS_ADDED_EVENT,
        new CustomerPointsAddedEvent('user-1', 'resto-1', 50, 120, 'Commande 42'),
      );
    });

    it('throws ConflictException when the order can no longer be claimed', async () => {
      orderRepository.claimForUser.mockResolvedValue(null);

      await expect(service.claimPoints(token, 'user-1')).rejects.toThrow(ConflictException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it.each(invalidTokens)('throws BadRequestException for a token %s', async (_, sign) => {
      await expect(service.claimPoints(await sign(), 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(orderRepository.claimForUser).not.toHaveBeenCalled();
    });
  });

  describe('claimPointsByEmail', () => {
    it('credits the verified account of the email', async () => {
      appUserRepository.findOne.mockResolvedValue({ id: 'user-2' });
      orderRepository.claimForUser.mockResolvedValue(transaction);

      await expect(service.claimPointsByEmail(token, EMAIL)).resolves.toEqual({ points: 50 });

      expect(appUserRepository.findOne).toHaveBeenCalledWith({
        authUser: { email: EMAIL, emailVerified: true },
      });
      expect(orderRepository.claimForUser).toHaveBeenCalledWith(ORDER_ID, 'user-2');
      expect(orderRepository.claimForEmail).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CUSTOMER_POINTS_ADDED_EVENT,
        new CustomerPointsAddedEvent('user-2', 'resto-1', 50, 120, 'Commande 42'),
      );
    });

    it('keeps the points pending without a verified account, with the same answer', async () => {
      appUserRepository.findOne.mockResolvedValue(null);
      orderRepository.claimForEmail.mockResolvedValue({ points: 50 });

      await expect(service.claimPointsByEmail(token, EMAIL)).resolves.toEqual({ points: 50 });

      expect(orderRepository.claimForEmail).toHaveBeenCalledWith(ORDER_ID, EMAIL);
      expect(orderRepository.claimForUser).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the order can no longer be claimed', async () => {
      appUserRepository.findOne.mockResolvedValue(null);
      orderRepository.claimForEmail.mockResolvedValue(null);

      await expect(service.claimPointsByEmail(token, EMAIL)).rejects.toThrow(ConflictException);
    });

    it.each(invalidTokens)(
      'throws BadRequestException for a token %s, before looking for the account',
      async (_, sign) => {
        await expect(service.claimPointsByEmail(await sign(), EMAIL)).rejects.toThrow(
          BadRequestException,
        );
        expect(appUserRepository.findOne).not.toHaveBeenCalled();
        expect(orderRepository.claimForEmail).not.toHaveBeenCalled();
      },
    );
  });
});
