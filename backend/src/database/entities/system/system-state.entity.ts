import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ESystemStateBackend {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Index()
  @Column({ type: 'varchar', nullable: false, unique: true })
  key: string;

  @Column({ type: 'text', nullable: false })
  value: string;
}
