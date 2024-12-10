import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const initialTasks = [
  { title: 'Task 1', description: 'Description 1' },
  { title: 'Task 2', description: 'Description 2' },
  { title: 'Task 3', description: 'Description 3' },
];

const seed = async () => {
  // clean up before the seeding (optional)
  await prisma.task.deleteMany();

  // you could also use createMany
  // but it is not supported for databases
  // e.g. SQLite https://github.com/prisma/prisma/issues/10710
  for (const task of initialTasks) {
    await prisma.task.create({data: task});
  }
};

seed();
