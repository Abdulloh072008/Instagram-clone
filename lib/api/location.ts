import { request, ApiResponse } from "./http";
import type {
  GetLocationsParams,
  AddLocationRequest,
  UpdateLocationRequest,
} from "./types";

/**
 * /Location — справочник локаций.
 */

/** Список локаций с фильтрами и пагинацией. */
export function getLocations(params: GetLocationsParams = {}) {
  return request<ApiResponse<unknown>>("/Location/get-Locations", {
    query: {
      City: params.city,
      State: params.state,
      ZipCode: params.zipCode,
      Country: params.country,
      PageNumber: params.pageNumber,
      PageSize: params.pageSize,
    },
  });
}

/** Локация по id. */
export function getLocationById(id: number) {
  return request<ApiResponse<unknown>>("/Location/get-Location-by-id", { query: { id } });
}

/** Добавить локацию. */
export function addLocation(payload: AddLocationRequest) {
  return request<ApiResponse<unknown>>("/Location/add-Location", {
    method: "POST",
    json: payload,
  });
}

/** Обновить локацию. */
export function updateLocation(payload: UpdateLocationRequest) {
  return request<ApiResponse<unknown>>("/Location/update-Location", {
    method: "PUT",
    json: payload,
  });
}

/** Удалить локацию. */
export function deleteLocation(id: number) {
  return request<ApiResponse<unknown>>("/Location/delete-Location", {
    method: "DELETE",
    query: { id },
  });
}
