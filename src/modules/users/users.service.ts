import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { User } from './entities/user.entity';
import { UserCredential } from '../user-credential/entities/user-credential.entity';
import { hashString } from '../../shares/helpers/cryptography';
import { isNullOrUndefined } from '../../shares/helpers/utils';
import { UserRole } from '../../shares/enums/user-role.enum';
import { RegisterRequestDto } from '../auth/dtos/register-request.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCredential)
    private readonly userCredentialRepository: Repository<UserCredential>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['credential'],
    });
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['credential'],
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  async addNewUser(registerRequest: RegisterRequestDto, entityManager?: EntityManager): Promise<User> {
    const userRepo = entityManager ? entityManager.getRepository(User) : this.userRepository;
    const credentialRepo = entityManager
      ? entityManager.getRepository(UserCredential)
      : this.userCredentialRepository;

    const existingUser = await userRepo.findOne({
      where: { email: registerRequest.email },
    });

    if (!isNullOrUndefined(existingUser)) {
      throw new UnprocessableEntityException('Email already exists');
    }

    const hashedPassword = await hashString(registerRequest.password);
    const role = registerRequest.role || UserRole.NORMAL_USER;

    const user = userRepo.create({
      email: registerRequest.email,
      full_name: registerRequest.full_name,
      role,
      is_active: true,
    });

    const savedUser = await userRepo.save(user);

    const credential = credentialRepo.create({
      user_id: savedUser.id,
      email: registerRequest.email,
      password: hashedPassword,
    });

    await credentialRepo.save(credential);

    return savedUser;
  }

  async updateUserLastLoginAt(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      last_login_at: new Date(),
    });
  }

  async saveUser(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async aboutMe(userId: number): Promise<User> {
    return this.getUserById(userId);
  }
}

