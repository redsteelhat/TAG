import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLog } from '../audit/audit-log.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { ListAttachmentsQueryDto } from './dto/list-attachments-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('attachments')
@ApiTags('Attachments')
@ApiBearerAuth('access-token')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create attachment metadata' })
  @AuditLog({
    action: 'attachment.create',
    entityType: 'attachment',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAttachmentDto
  ) {
    return {
      data: await this.attachmentsService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List current user attachments' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAttachmentsQueryDto
  ) {
    return this.attachmentsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attachment metadata by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.attachmentsService.findOne(user.id, id)
    };
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get an attachment access URL placeholder' })
  async getSignedUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return {
      data: await this.attachmentsService.getSignedUrl(user.id, id)
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete attachment metadata' })
  @AuditLog({
    action: 'attachment.delete',
    entityType: 'attachment',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.attachmentsService.remove(user.id, id)
    };
  }
}
