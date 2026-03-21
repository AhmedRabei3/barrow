import { Dispatch, SetStateAction } from "react";
import { request } from "@/app/utils/axios";
import toast from "react-hot-toast";
import { ActiveCode } from "./CodeCard";

interface CodeFetchProps {
  setLoading: Dispatch<SetStateAction<boolean>>;
  setCodes: Dispatch<SetStateAction<ActiveCode[]>>;
  setFilteredCodes: Dispatch<SetStateAction<ActiveCode[]>>;
  messages?: {
    noCodes?: string;
    fetchError?: string;
  };
}

const codeFetch = ({
  setLoading,
  setCodes,
  setFilteredCodes,
  messages,
}: CodeFetchProps) => {
  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data } = await request.get("/api/admin/active_code");
      if (!data || !Array.isArray(data)) {
        toast.error(messages?.noCodes || "No codes found");
      } else {
        setCodes(data);
        setFilteredCodes(data);
      }
    } catch (error) {
      console.error(error);
      toast.error(messages?.fetchError || "Error fetching codes");
    } finally {
      setLoading(false);
    }
  };
  fetchCodes();
};

export default codeFetch;
