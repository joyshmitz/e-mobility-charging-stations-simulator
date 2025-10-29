// Partial Copyright Jerome Benoit. 2021-2025. All Rights Reserved.

import type { JSONSchemaType } from 'ajv'

import { type JsonType, OCPPVersion } from '../../../types/index.js'
import { OCPPServiceUtils } from '../OCPPServiceUtils.js'

export class OCPP20ServiceUtils extends OCPPServiceUtils {
  public static enforceMessageLimits<
    T extends { attributeType?: unknown; component: unknown; variable: unknown }
  >(
    chargingStation: { logPrefix: () => string },
    moduleName: string,
    context: string,
    data: T[],
    itemsLimit: number,
    bytesLimit: number,
    buildRejected: (item: T, reason: { info: string; reasonCode: string }) => unknown,
    logger: { debug: (...args: unknown[]) => void }
  ): { rejected: boolean; results: unknown[] } {
    if (itemsLimit > 0 && data.length > itemsLimit) {
      const results = data.map(d =>
        buildRejected(d, {
          info: `ItemsPerMessage limit ${itemsLimit.toString()} exceeded (${data.length.toString()} requested)`,
          reasonCode: 'TooManyElements',
        })
      )
      logger.debug(
        `${chargingStation.logPrefix()} ${moduleName}.${context}: Rejected all variables due to ItemsPerMessage limit (${itemsLimit.toString()})`
      )
      return { rejected: true, results }
    }
    if (bytesLimit > 0) {
      const estimatedSize = Buffer.byteLength(JSON.stringify(data), 'utf8')
      if (estimatedSize > bytesLimit) {
        const results = data.map(d =>
          buildRejected(d, {
            info: `BytesPerMessage limit ${bytesLimit.toString()} exceeded (estimated ${estimatedSize.toString()} bytes)`,
            reasonCode: 'TooLargeElement',
          })
        )
        logger.debug(
          `${chargingStation.logPrefix()} ${moduleName}.${context}: Rejected all variables due to BytesPerMessage limit (${bytesLimit.toString()})`
        )
        return { rejected: true, results }
      }
    }
    return { rejected: false, results: [] }
  }

  public static enforcePostCalculationBytesLimit<
    T extends { attributeType?: unknown; component: unknown; variable: unknown }
  >(
    chargingStation: { logPrefix: () => string },
    moduleName: string,
    context: string,
    originalData: T[],
    currentResults: unknown[],
    bytesLimit: number,
    buildRejected: (item: T, reason: { info: string; reasonCode: string }) => unknown,
    logger: { debug: (...args: unknown[]) => void }
  ): unknown[] {
    if (bytesLimit > 0) {
      try {
        const actualSize = Buffer.byteLength(JSON.stringify(currentResults), 'utf8')
        if (actualSize > bytesLimit) {
          const results = originalData.map(d =>
            buildRejected(d, {
              info: `BytesPerMessage limit ${bytesLimit.toString()} exceeded (actual ${actualSize.toString()} bytes)`,
              reasonCode: 'TooLargeElement',
            })
          )
          logger.debug(
            `${chargingStation.logPrefix()} ${moduleName}.${context}: Rejected all variables due to BytesPerMessage limit post calculation (${bytesLimit.toString()})`
          )
          return results
        }
      } catch {
        /* ignore */
      }
    }
    return currentResults
  }

  public static override parseJsonSchemaFile<T extends JsonType>(
    relativePath: string,
    moduleName?: string,
    methodName?: string
  ): JSONSchemaType<T> {
    return OCPPServiceUtils.parseJsonSchemaFile<T>(
      relativePath,
      OCPPVersion.VERSION_201,
      moduleName,
      methodName
    )
  }
}
