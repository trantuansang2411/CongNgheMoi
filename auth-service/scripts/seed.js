const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Fallback for running outside of Docker
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://postgres:postgres123@localhost:5432/auth_db?schema=public";
}

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding authentication database (auth-service)...');

    // Hash a generic password for all seed accounts
    const plainPassword = 'password123';
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    console.log(`Using default password: ${plainPassword} for all seeded accounts`);

    // Seed Roles
    const roleNames = ['ADMIN', 'INSTRUCTOR', 'STUDENT'];
    const roles = {};

    for (const name of roleNames) {
        roles[name] = await prisma.role.upsert({
            where: { name },
            update: {},
            create: { name },
        });
        console.log(`Role [${name}] created or verified in DB`);
    }

    // Array of mock accounts
    const seedAccounts = [
        { email: 'admin@gmail.com', role: 'ADMIN', status: 'ACTIVE' },
        { email: 'instructor@gmail.com', role: 'INSTRUCTOR', status: 'ACTIVE' },
        { email: 'student@gmail.com', role: 'STUDENT', status: 'ACTIVE' },
    ];

    for (const data of seedAccounts) {
        const existingAccount = await prisma.account.findUnique({
            where: { email: data.email }
        });

        if (!existingAccount) {
            // Create account
            const account = await prisma.account.create({
                data: {
                    email: data.email,
                    passwordHash,
                    status: data.status,
                    provider: 'LOCAL'
                }
            });

            // Assign role
            await prisma.accountRole.create({
                data: {
                    accountId: account.id,
                    roleId: roles[data.role].id
                }
            });

            console.log(`Created account: ${data.email} with role [${data.role}]`);
        } else {
            console.log(`Account ${data.email} already exists, skipping creation.`);
            
            // To ensure existing account has the required role (in case it was manually created but misses the role)
            const roleExists = await prisma.accountRole.findUnique({
                where: {
                    accountId_roleId: {
                        accountId: existingAccount.id,
                        roleId: roles[data.role].id
                    }
                }
            });
            
            if (!roleExists) {
                await prisma.accountRole.create({
                    data: {
                        accountId: existingAccount.id,
                        roleId: roles[data.role].id
                    }
                });
                console.log(`Added missing role [${data.role}] to account ${data.email}.`);
            }
        }
    }

    console.log('\n✅ Database Seeding Successfully Completed!');
}

main()
    .catch((e) => {
        console.error('Error seeding auth DB:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
