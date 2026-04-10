import bcrypt from "bcryptjs";

export const matchPassword = async (password: string, userPassword: string) => {
  const match = await bcrypt.compare(password, userPassword);
  return match;
};
