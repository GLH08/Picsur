import { EAlbum } from 'picsur-shared/dist/entities/album.entity';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class EAlbumBackend implements EAlbum {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  description: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  cover_url: string | null;

  @Column({
    type: 'simple-array',
    nullable: false,
    default: '',
  })
  image_ids: string[];

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  updated: Date;
}
