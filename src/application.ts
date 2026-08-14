import {
  AuthenticationComponent,
  registerAuthenticationStrategy,
} from '@loopback/authentication';
import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {JWTStrategy} from './authentication-strategy/jwt-strategy';
import {DbDataSource} from './datasources';
import {
  EmailServiceBindings,
  OtpServiceBindings,
  PasswordHasherBindings,
  RbacServiceBindings,
  TokenServiceBindings,
  TokenServiceConstants,
  UserServiceBindings,
} from './keys';
import {
  AssetTypesRepository,
  ComplianceStatusesRepository,
  GradeLevelsRepository,
  OtpRepository,
  PermissionsRepository,
  RolePermissionsRepository,
  RolesRepository,
  StudentProfileRepository,
  SubjectsRepository,
  TiersRepository,
  UserRolesRepository,
  UsersRepository,
} from './repositories';
import {MySequence} from './sequence';
import {
  BcryptHasher,
  EmailService,
  JWTService,
  MyUserService,
  OtpService,
  RbacService,
} from './services';

export {ApplicationConfig};

export class LmsBackendApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Register Authentication Component
    this.component(AuthenticationComponent);

    // Set up custom sequence
    this.sequence(MySequence);

    // Bind custom services & JWT authentication
    this.setUpBindings();

    // Register JWT Authentication Strategy
    registerAuthenticationStrategy(this, JWTStrategy);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Booter conventions
    this.bootOptions = {
      controllers: {
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
      repositories: {
        dirs: ['repositories'],
        extensions: ['.repository.js'],
        nested: true,
      },
      datasources: {
        dirs: ['datasources'],
        extensions: ['.datasource.js'],
        nested: true,
      },
    };
  }

  setUpBindings(): void {
    // Datasource & Repository bindings
    this.dataSource(DbDataSource);
    this.repository(UsersRepository);
    this.repository(RolesRepository);
    this.repository(UserRolesRepository);
    this.repository(PermissionsRepository);
    this.repository(RolePermissionsRepository);
    this.repository(StudentProfileRepository);
    this.repository(GradeLevelsRepository);
    this.repository(SubjectsRepository);
    this.repository(TiersRepository);
    this.repository(AssetTypesRepository);
    this.repository(ComplianceStatusesRepository);
    this.repository(OtpRepository);

    // Hasher binding
    this.bind(PasswordHasherBindings.PASSWORD_HASHER).toClass(BcryptHasher);

    // JWT Bindings
    this.bind(TokenServiceBindings.TOKEN_SECRET).to(
      process.env.JWT_SECRET || TokenServiceConstants.TOKEN_SECRET_VALUE,
    );
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to(
      process.env.JWT_EXPIRES_IN || TokenServiceConstants.TOKEN_EXPIRES_IN_VALUE,
    );
    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);

    // User Service Binding
    this.bind(UserServiceBindings.USER_SERVICE).toClass(MyUserService);

    // RBAC Service Binding
    this.bind(RbacServiceBindings.RBAC_SERVICE).toClass(RbacService);

    // Email Service Binding
    this.bind(EmailServiceBindings.EMAIL_SERVICE).toClass(EmailService);

    // OTP Service Binding
    this.bind(OtpServiceBindings.OTP_SERVICE).toClass(OtpService);
  }
}
