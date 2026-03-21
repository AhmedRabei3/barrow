import { prisma } from "./prisma";

export const PrismaAdapter = (prismaClient) => {
  return {
    async createUser(user) {
      return prismaClient.user.create({
        data: user,
      });
    },
    async getUser(id) {
      return prismaClient.user.findUnique({
        where: { id: String(id) },
      });
    },
    async getUserByEmail(email) {
      return prismaClient.user.findUnique({
        where: { email },
      });
    },
    async updateUser(user) {
      return prismaClient.user.update({
        where: { id: user.id },
        data: user,
      });
    },
    async deleteUser(id) {
      return prismaClient.user.delete({
        where: { id: String(id) },
      });
    },
    async linkAccount(account) {
      return prismaClient.account.create({
        data: account,
      });
    },
    async unlinkAccount(providerAccountId) {
      return prismaClient.account.delete({
        where: { providerAccountId },
      });
    },
    async getSession(sessionToken) {
      return prismaClient.session.findUnique({
        where: { sessionToken },
      });
    },
    async createSession(session) {
      return prismaClient.session.create({
        data: session,
      });
    },
    async updateSession(session) {
      return prismaClient.session.update({
        where: { id: session.id },
        data: session,
      });
    },
    async deleteSession(sessionToken) {
      return prismaClient.session.delete({
        where: { sessionToken },
      });
    },
  };
};

// قم بتصدير محول Prisma مخصص
export default PrismaAdapter(prisma);
