import { z } from 'zod';
import { createZodDto } from '../../util/create-zod-dto.js';
import { IsEntityID } from '../../validators/entity-id.validator.js';

// Album entity schema
export const EAlbumSchema = z.object({
  id: IsEntityID(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(50),
  description: z.string().max(200).nullable(),
  cover_url: z.string().nullable(),
  image_ids: z.array(z.string().uuid()),
  created: z.coerce.date(),
  updated: z.coerce.date(),
});

// Album create/update
export const AlbumCreateRequestSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});
export class AlbumCreateRequest extends createZodDto(AlbumCreateRequestSchema) {}

export const AlbumUpdateRequestSchema = z.object({
  id: IsEntityID(),
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  cover_url: z.string().nullable().optional(),
});
export class AlbumUpdateRequest extends createZodDto(AlbumUpdateRequestSchema) {}

// Album list
export const AlbumListResponseSchema = z.object({
  results: z.array(EAlbumSchema),
});
export class AlbumListResponse extends createZodDto(AlbumListResponseSchema) {}

// Album add/remove images
export const AlbumAddImagesRequestSchema = z.object({
  album_id: IsEntityID(),
  image_ids: z.array(z.string().uuid()),
});
export class AlbumAddImagesRequest extends createZodDto(AlbumAddImagesRequestSchema) {}

export const AlbumRemoveImagesRequestSchema = z.object({
  album_id: IsEntityID(),
  image_ids: z.array(z.string().uuid()),
});
export class AlbumRemoveImagesRequest extends createZodDto(AlbumRemoveImagesRequestSchema) {}
