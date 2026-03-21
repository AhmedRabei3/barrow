import { DynamicIcon } from "@/app/components/addCategory/IconSetter";

type ItemDetailsData = {
  brand?: string;
  title?: string;
  name?: string;
  model?: string;
  color?: string;
  fuelType?: string;
  gearType?: string;
  status?: string;
  rentType?: string;
  price?: number;
  description?: string;
};

interface elementPropereties {
  data: ItemDetailsData;
  location: { state: string; country: string; address: string; city: string };
}

const ElementPropereties = ({ data, location }: elementPropereties) => {
  const rentType = data?.rentType;
  return (
    <div className="mt-4 bg-white rounded-lg p-4 shadow-inner">
      <h2 className="text-xl font-semibold mb-3 text-sky-800 w-full text-center border-b pb-1">
        {data.brand || data.title || data.name}{" "}
        {data.model && `(${data.model})`}
      </h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-gray-700 text-sm sm:text-base">
        {data.color && (
          <li className="flex gap-4 items-center">
            🔹 Color :{" "}
            <span
              style={{
                backgroundColor: data.color,
                borderRadius: 50,
                height: 15,
                width: 15,
              }}
            >
              <div className="h-0.5 w-5 overflow-hidden">.</div>
            </span>
          </li>
        )}
        {data.fuelType && <li>🔹 Feul : {data.fuelType}</li>}
        {data.gearType && <li>🔹 Gear : {data.gearType}</li>}
        <li>🔹 Status : {data.status}</li>
        <li className="font-bold">
          {rentType ? <span>Rent type : {rentType}</span> : "🔹 For Sell"}
        </li>
        <li>
          🔹 Price :{" "}
          <span className="text-rose-700 font-semibold">{data.price} $</span> /{" "}
          {rentType?.toLowerCase()}
        </li>
      </ul>
      {location && (
        <div className="flex pt-1 gap-1">
          <p className="font-bold flex text-sky-800">
            <DynamicIcon iconName="MdLocationPin" className="text-sky-700" />
            Addres :{" "}
          </p>
          {location.state} - {location.city}
        </div>
      )}
      {data.description && (
        <div className="p-1 px-2 border rounded shadow-md mt-5 text-sky-800">
          Description :
          <p className="mt-3 text-gray-600 italic">{data.description}</p>
        </div>
      )}
    </div>
  );
};

export default ElementPropereties;
