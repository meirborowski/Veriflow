import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AttachmentsService,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
} from './attachments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResolveProjectFrom } from '../common/decorators/resolve-project.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/types/enums';

@Controller('attachments')
@UseGuards(RolesGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('entity/:entityType/:entityId')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('attachment-entity')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `File type "${file.mimetype}" is not allowed`,
            ),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Param('entityType') entityType: string,
    @Param('entityId', new ParseUUIDPipe({ version: '4' })) entityId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.attachmentsService.upload(
      file,
      entityType,
      entityId,
      user.userId,
    );
  }

  @Get('entity/:entityType/:entityId')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('attachment-entity')
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', new ParseUUIDPipe({ version: '4' })) entityId: string,
  ) {
    return this.attachmentsService.findByEntity(entityType, entityId);
  }

  @Get(':id/download')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('attachment')
  async getDownloadUrl(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const url = await this.attachmentsService.getDownloadUrl(id);
    return { url };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('attachment')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.attachmentsService.remove(id);
  }
}
