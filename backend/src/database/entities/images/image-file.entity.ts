import { ImageEntryVariant } from 'picsur-shared/dist/dto/image-entry-variant.enum';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EImageBackend } from './image.entity.js';

@Entity()
@Unique(['image_id', 'variant'])
export class EImageFileBackend {
  @PrimaryGeneratedColumn('uuid')
  private _id?: string;

  // We do a little trickery
  @Index()
  @ManyToOne(() => EImageBackend, (image) => image.files, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'image_id' })
  private _image?: any;

  @Column({
    name: 'image_id',
    type: 'uuid',
  })
  image_id: string;

  @Index()
  @Column({ type: 'enum', nullable: false, enum: ImageEntryVariant })
  variant: ImageEntryVariant;

  @Column({ type: 'varchar', nullable: false })
  filetype: string;

  @Column({ type: 'text', nullable: true })
  path: string;

  // Binary data
  @Column({ type: 'bytea', nullable: true })
  data: Buffer;
}
