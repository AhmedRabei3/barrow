import { request } from "@/app/utils/axios";
interface getCategoryByNameInterface {
  name: string;
}
const getCategoryByName = async ({ name }: getCategoryByNameInterface) => {
  const categories = await request.get(`api/categories?name:${name}`);
  return categories;
};

export default getCategoryByName;
