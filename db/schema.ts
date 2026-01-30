import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/* =========================
   Better Auth tables
========================= */

export const usersTables = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessionsTables = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => usersTables.id, { onDelete: 'cascade' }),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const accountsTables = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTables.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)],
);

export const verificationsTables = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

/* =========================
   Domain tables (Dr.Agenda)
========================= */

export const clinicsTables = pgTable('clinics', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const usersToClinicsTables = pgTable('users_to_clinics', {
  userId: text('user_id')
    .notNull()
    .references(() => usersTables.id, { onDelete: 'cascade' }),
  clinicId: uuid('clinic_id')
    .notNull()
    .references(() => clinicsTables.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const doctorsTables = pgTable('doctors', {
  id: uuid('id').defaultRandom().primaryKey(),
  clinicId: uuid('clinic_id')
    .notNull()
    .references(() => clinicsTables.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  avatarImageUrl: text('avatar_image_url'),
  specialty: text('specialty').notNull(),
  availableFromWeekDay: integer('available_from_week_day').notNull(),
  availableToWeekDay: integer('available_to_week_day').notNull(),
  availableFromTime: time('available_from_time').notNull(),
  availableToTime: time('available_to_time').notNull(),
  appointmentPriceInCents: integer('appointment_price_in_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const patientSexEnums = pgEnum('patient_sex', ['male', 'female']);

export const patientsTables = pgTable('patients', {
  id: uuid('id').defaultRandom().primaryKey(),
  clinicId: uuid('clinic_id')
    .notNull()
    .references(() => clinicsTables.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phoneNumber: text('phone_number').notNull(),
  sex: patientSexEnums('sex').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const appointmentsTables = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  clinicId: uuid('clinic_id')
    .notNull()
    .references(() => clinicsTables.id, { onDelete: 'cascade' }),
  doctorId: uuid('doctor_id')
    .notNull()
    .references(() => doctorsTables.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .notNull()
    .references(() => patientsTables.id, { onDelete: 'cascade' }),
  date: timestamp('appointment_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* =========================
   Relations
========================= */

export const usersTablesRelations = relations(usersTables, ({ many }) => ({
  sessions: many(sessionsTables),
  accounts: many(accountsTables),
  usersToClinics: many(usersToClinicsTables),
}));

export const sessionsTablesRelations = relations(sessionsTables, ({ one }) => ({
  user: one(usersTables, {
    fields: [sessionsTables.userId],
    references: [usersTables.id],
  }),
}));

export const accountsTablesRelations = relations(accountsTables, ({ one }) => ({
  user: one(usersTables, {
    fields: [accountsTables.userId],
    references: [usersTables.id],
  }),
}));

export const usersToClinicsTablesRelations = relations(usersToClinicsTables, ({ one }) => ({
  user: one(usersTables, {
    fields: [usersToClinicsTables.userId],
    references: [usersTables.id],
  }),
  clinic: one(clinicsTables, {
    fields: [usersToClinicsTables.clinicId],
    references: [clinicsTables.id],
  }),
}));

export const clinicsTablesRelations = relations(clinicsTables, ({ many }) => ({
  doctors: many(doctorsTables),
  patients: many(patientsTables),
  appointments: many(appointmentsTables),
  usersToClinics: many(usersToClinicsTables),
}));

export const doctorsTablesRelations = relations(doctorsTables, ({ one, many }) => ({
  clinic: one(clinicsTables, {
    fields: [doctorsTables.clinicId],
    references: [clinicsTables.id],
  }),
  appointments: many(appointmentsTables),
}));

export const patientsTablesRelations = relations(patientsTables, ({ one, many }) => ({
  clinic: one(clinicsTables, {
    fields: [patientsTables.clinicId],
    references: [clinicsTables.id],
  }),
  appointments: many(appointmentsTables),
}));

export const appointmentsTablesRelations = relations(appointmentsTables, ({ one }) => ({
  clinic: one(clinicsTables, {
    fields: [appointmentsTables.clinicId],
    references: [clinicsTables.id],
  }),
  doctor: one(doctorsTables, {
    fields: [appointmentsTables.doctorId],
    references: [doctorsTables.id],
  }),
  patient: one(patientsTables, {
    fields: [appointmentsTables.patientId],
    references: [patientsTables.id],
  }),
}));
