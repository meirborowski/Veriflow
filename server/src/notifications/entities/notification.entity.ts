import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationType } from '../../common/types/enums';
import { User } from '../../auth/entities/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  relatedEntityType: string | null;

  @Column({ type: 'uuid', nullable: true })
  relatedEntityId: string | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
