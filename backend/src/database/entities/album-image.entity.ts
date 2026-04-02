import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('e_album_image_backend')
@Unique(['album_id', 'image_id'])
@Index(['album_id'])
@Index(['image_id'])
export class EAlbumImageBackend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  album_id: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  image_id: string;

  @Column({
    type: 'int',
    nullable: false,
    default: 0,
  })
  position: number;

  @Column({
    type: 'timestamptz',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  added_at: Date;
}
