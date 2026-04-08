import { apiClient } from "@/lib/api";
import { PROPERTY_ID_QUERY_PARAM } from "@/lib/constants";
import type {
  ChannexConnectBody,
  ChannexProperty,
  ChannexPropertyLink,
  ChannexProvisionResult,
  ChannexRatePlanRow,
  ChannexRoomTypeRow,
  ChannexStatus,
  ChannexValidateKeyBody,
  RateMappingBody,
  RoomMappingBody,
} from "@/types/channex";

export async function validateChannexKey(
  body: ChannexValidateKeyBody
): Promise<ChannexProperty[]> {
  const { data } = await apiClient.post<ChannexProperty[]>(
    "/channex/validate-key",
    body
  );
  return data;
}

export async function createChannexProperty(
  body: ChannexValidateKeyBody,
  propertyId: string
): Promise<ChannexProperty> {
  const { data } = await apiClient.post<ChannexProperty>(
    "/channex/create-property",
    body,
    {
      params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
    }
  );
  return data;
}

export async function provisionChannexFromOpenpms(
  propertyId: string
): Promise<ChannexProvisionResult> {
  const { data } = await apiClient.post<ChannexProvisionResult>(
    "/channex/provision-from-openpms",
    {},
    { params: { [PROPERTY_ID_QUERY_PARAM]: propertyId } }
  );
  return data;
}

export async function connectChannex(
  body: ChannexConnectBody,
  propertyId: string
): Promise<ChannexPropertyLink> {
  const { data } = await apiClient.post<ChannexPropertyLink>(
    "/channex/connect",
    body,
    {
      params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
    }
  );
  return data;
}

export async function fetchChannexStatus(
  propertyId: string
): Promise<ChannexStatus> {
  const { data } = await apiClient.get<ChannexStatus>("/channex/status", {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
  return data;
}

export async function fetchChannexRooms(
  propertyId: string
): Promise<ChannexRoomTypeRow[]> {
  const { data } = await apiClient.get<ChannexRoomTypeRow[]>(
    "/channex/channex-rooms",
    { params: { [PROPERTY_ID_QUERY_PARAM]: propertyId } }
  );
  return data;
}

export async function fetchChannexRates(
  propertyId: string
): Promise<ChannexRatePlanRow[]> {
  const { data } = await apiClient.get<ChannexRatePlanRow[]>(
    "/channex/channex-rates",
    { params: { [PROPERTY_ID_QUERY_PARAM]: propertyId } }
  );
  return data;
}

export async function mapChannexRooms(
  body: RoomMappingBody,
  propertyId: string
): Promise<void> {
  await apiClient.post("/channex/map-rooms", body, {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
}

export async function mapChannexRates(
  body: RateMappingBody,
  propertyId: string
): Promise<void> {
  await apiClient.post("/channex/map-rates", body, {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
}

export async function activateChannex(
  propertyId: string
): Promise<ChannexPropertyLink> {
  const { data } = await apiClient.post<ChannexPropertyLink>(
    "/channex/activate",
    {},
    {
      params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
    }
  );
  return data;
}

export async function disconnectChannex(propertyId: string): Promise<void> {
  await apiClient.post("/channex/disconnect", {}, {
    params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
  });
}

export async function syncChannexToBackend(propertyId: string): Promise<{ detail: string }> {
  const { data } = await apiClient.post<{ detail: string }>(
    "/channex/sync",
    {},
    {
      params: { [PROPERTY_ID_QUERY_PARAM]: propertyId },
    }
  );
  return data;
}
