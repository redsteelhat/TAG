import { BadRequestException } from '@nestjs/common';
import { AttachmentType } from '@prisma/client';
import { AttachmentsService } from './attachments.service';

describe('AttachmentsService', () => {
  it('requires exactly one parent entity', () => {
    const service = new AttachmentsService({} as never);

    expect(() =>
      (
        service as unknown as {
          assertSingleParent(dto: { tripId?: string; fuelEntryId?: string }): void;
        }
      ).assertSingleParent({ fuelEntryId: 'fuel_1', tripId: 'trip_1' })
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported mime types', () => {
    const service = new AttachmentsService({} as never);

    expect(() =>
      (
        service as unknown as {
          assertSupportedMimeType(mimeType: string): void;
        }
      ).assertSupportedMimeType('application/x-msdownload')
    ).toThrow(BadRequestException);
  });

  it('maps attachment responses', () => {
    const service = new AttachmentsService({} as never);
    const response = (
      service as unknown as {
        toAttachmentResponse(attachment: Record<string, unknown>): {
          fileUrl: string;
          mimeType: string;
          tripId: string | null;
          type: AttachmentType;
        };
      }
    ).toAttachmentResponse({
      created_at: new Date('2026-06-17T00:00:00.000Z'),
      deleted_at: null,
      expense_entry_id: null,
      file_size_bytes: 242300,
      file_url: 'https://storage.example/receipt.jpg',
      fuel_entry_id: null,
      id: 'att_1',
      maintenance_entry_id: null,
      mime_type: 'image/jpeg',
      original_name: 'receipt.jpg',
      storage_key: 'users/user_1/receipt.jpg',
      trip_id: 'trip_1',
      type: AttachmentType.RECEIPT,
      user_id: 'user_1'
    });

    expect(response.fileUrl).toBe('https://storage.example/receipt.jpg');
    expect(response.mimeType).toBe('image/jpeg');
    expect(response.tripId).toBe('trip_1');
    expect(response.type).toBe(AttachmentType.RECEIPT);
  });
});
