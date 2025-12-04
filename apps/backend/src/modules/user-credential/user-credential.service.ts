import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCredential } from './entities/user-credential.entity';
import { isHashEqual, hashString } from '../../shares/helpers/cryptography';
import { isNullOrUndefined } from '../../shares/helpers/utils';

@Injectable()
export class UserCredentialService {
  constructor(
    @InjectRepository(UserCredential)
    private readonly userCredentialRepository: Repository<UserCredential>,
  ) {}

  async getUserWithUsernameAndPassword(email: string, password: string, throwException = false) {
    const credential = await this.userCredentialRepository.findOne({
      where: { email },
      relations: ['user'],
    });

    if (isNullOrUndefined(credential)) {
      if (throwException) {
        throw new BadRequestException('Email or password is incorrect');
      }
      return null;
    }

    const isPasswordMatched = await isHashEqual(password, credential.password);
    if (!isPasswordMatched) {
      if (throwException) {
        throw new BadRequestException('Email or password is incorrect');
      }
      return null;
    }

    return credential.user;
  }

  async resetPassword(email: string, password: string): Promise<UserCredential> {
    const credential = await this.userCredentialRepository.findOne({
      where: { email },
      relations: ['user'],
    });

    if (isNullOrUndefined(credential)) {
      throw new BadRequestException('Credential not found');
    }

    credential.password = await hashString(password);
    await this.userCredentialRepository.update({ user_id: credential.user_id }, { password: credential.password });
    return this.userCredentialRepository.findOne({
      where: { user_id: credential.user_id },
      relations: ['user'],
    });
  }
}
