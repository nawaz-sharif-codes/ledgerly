import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment';
import { createTypeOrmOptions } from './typeorm.options';

const environment = validateEnvironment(process.env);

export default new DataSource(createTypeOrmOptions(environment));
