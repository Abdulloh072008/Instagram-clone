import { request, ApiResponse, PagedResponse } from "./http";
import { EXTRA_API_BASE_URL } from "./config";
import type {
  GetLocationsParams,
  AddLocationRequest,
  UpdateLocationRequest,
  Location,
} from "./types";

/**
 * /Location — справочник локаций.
 *
 * ВНИМАНИЕ: в основном API update-Location сломан (400, битый AutoMapper),
 * поэтому ВСЕ запросы локаций идут в наш дополнительный бэкенд
 * (InstagramExtraApi), где CRUD полностью рабочий. Данные локаций там свои.
 * Адрес доп-бэка задаётся в EXTRA_API_BASE_URL / NEXT_PUBLIC_EXTRA_API_URL.
 */
const extra = { baseUrl: EXTRA_API_BASE_URL, auth: false as const };

/** Список локаций с фильтрами и пагинацией. */
export function getLocations(params: GetLocationsParams = {}) {
  return request<PagedResponse<Location>>("/Location/get-Locations", {
    ...extra,
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
  return request<ApiResponse<Location>>("/Location/get-Location-by-id", { ...extra, query: { id } });
}

/** Добавить локацию. */
export function addLocation(payload: AddLocationRequest) {
  return request<ApiResponse<Location>>("/Location/add-Location", {
    ...extra,
    method: "POST",
    json: payload,
  });
}

/** Обновить локацию (рабочее — через доп-бэкенд). */
export function updateLocation(payload: UpdateLocationRequest) {
  return request<ApiResponse<Location>>("/Location/update-Location", {
    ...extra,
    method: "PUT",
    json: payload,
  });
}

/** Удалить локацию. */
export function deleteLocation(id: number) {
  return request<ApiResponse<boolean>>("/Location/delete-Location", {
    ...extra,
    method: "DELETE",
    query: { id },
  });
}
