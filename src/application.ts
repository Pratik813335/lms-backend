import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {
  AuthenticationComponent,
  registerAuthenticationStrategy,
} from '@loopback/authentication';
import {JWTStrategy} from './authentication-strategy/jwt-strategy';
import {EmailManagerBindings} from './keys';
import {
  AssetTypesRepository,
  ComplianceStatusesRepository,
  CourseRepository,
  EnrollmentRepository,
  GradeLevelsRepository,
  LessonProgressRepository,
  LessonRepository,
  ModuleRepository,
  OtpRepository,
  PermissionsRepository,
  RolePermissionsRepository,
  RolesRepository,
  StudentProfileRepository,
  SubjectsRepository,
  UserRolesRepository,
  UsersRepository,
} from './repositories';
import {MySequence} from './sequence';
import {
  BcryptHasher,
  CourseService,
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

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    // Add LoopBack Authentication Component
    this.component(AuthenticationComponent);

    // Register custom JWT authentication strategy
    registerAuthenticationStrategy(this, JWTStrategy);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };

    this.setUpBinding();
  }

  setUpBinding(): void {
    // Hasher and Security Services (Amplio Pattern)
    this.bind('service.hasher').toClass(BcryptHasher);
    this.bind('services.rbac').toClass(RbacService);

    // JWT Secret, Expiry and Service (Amplio Pattern)
    this.bind('jwt.secret').to(
      process.env.JWT_SECRET || 'lms_super_secret_jwt_key_2026_velocrafts',
    );
    this.bind('jwt.expiresIn').to(process.env.JWT_EXPIRES_IN || '24h');
    this.bind('service.jwt.service').toClass(JWTService);

    // User Service (Amplio Pattern)
    this.bind('service.user.service').toClass(MyUserService);

    // Domain Services (Amplio Pattern)
    this.bind('services.course').toClass(CourseService);
    this.bind('services.otp').toClass(OtpService);
    this.bind(EmailManagerBindings.SEND_MAIL).toClass(EmailService);

    // Repositories Registration
    this.repository(UsersRepository);
    this.repository(RolesRepository);
    this.repository(UserRolesRepository);
    this.repository(PermissionsRepository);
    this.repository(RolePermissionsRepository);
    this.repository(StudentProfileRepository);
    this.repository(GradeLevelsRepository);
    this.repository(SubjectsRepository);
    this.repository(AssetTypesRepository);
    this.repository(ComplianceStatusesRepository);
    this.repository(OtpRepository);
    this.repository(CourseRepository);
    this.repository(ModuleRepository);
    this.repository(LessonRepository);
    this.repository(EnrollmentRepository);
    this.repository(LessonProgressRepository);
  }
}
