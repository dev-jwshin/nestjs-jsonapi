import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JsonApiModule } from '../src/json-api.module';
import { ValidationPipe } from '@nestjs/common';

// 글로벌 선언 (TypeScript가 전역 변수를 인식하도록)
declare global {
  namespace NodeJS {
    interface Global {
      testModule: TestingModule;
      testApp: INestApplication;
    }
  }
}

// 베이스 테스트 모듈 생성 함수
export async function createTestingApp(
  entities: any[],
  controllers: any[],
  providers: any[],
  entityOptions: any[] = []
): Promise<{ testModule: TestingModule, testApp: INestApplication }> {
  // 테스트 모듈 생성
  const moduleRef = await Test.createTestingModule({
    imports: [
      // 인메모리 SQLite DB 설정
      TypeOrmModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        entities: entities,
        synchronize: true,
        dropSchema: true,
      }),
      // 엔티티 등록
      TypeOrmModule.forFeature(entities),
      // JSON API 모듈 설정
      JsonApiModule.forRoot(),
      JsonApiModule.forFeature(entityOptions.length > 0 ? entityOptions : entities),
    ],
    controllers: controllers,
    providers: providers,
  }).compile();

  // 애플리케이션 초기화
  const app = moduleRef.createNestApplication();
  
  // 필요한 글로벌 파이프 및 인터셉터 등록
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  
  await app.init();
  
  return { testModule: moduleRef, testApp: app };
}

// 테스트 후 정리 함수
export async function cleanupTestingApp(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
  }
} 