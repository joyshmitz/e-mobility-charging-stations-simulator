/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from '@std/expect'
import { describe, it } from 'node:test'

import {
  addConfigurationKey,
  setConfigurationKeyValue,
} from '../../../../src/charging-station/ConfigurationKeyUtils.js'
import { OCPP20IncomingRequestService } from '../../../../src/charging-station/ocpp/2.0/OCPP20IncomingRequestService.js'
import { OCPP20VariableManager } from '../../../../src/charging-station/ocpp/2.0/OCPP20VariableManager.js'
import {
  GenericDeviceModelStatusEnumType,
  OCPP20ComponentName,
  OCPP20DeviceInfoVariableName,
  type OCPP20GetBaseReportRequest,
  type OCPP20SetVariableResultType,
  ReportBaseEnumType,
  type ReportDataType,
} from '../../../../src/types/index.js'
import {
  AttributeEnumType,
  OCPP20OptionalVariableName,
  OCPP20RequiredVariableName,
} from '../../../../src/types/index.js'
import { StandardParametersKey } from '../../../../src/types/ocpp/Configuration.js'
import { Constants } from '../../../../src/utils/index.js'
import { createChargingStationWithEvses } from '../../../ChargingStationFactory.js'
import {
  TEST_CHARGE_POINT_MODEL,
  TEST_CHARGE_POINT_SERIAL_NUMBER,
  TEST_CHARGE_POINT_VENDOR,
  TEST_CHARGING_STATION_NAME,
  TEST_FIRMWARE_VERSION,
} from './OCPP20TestConstants.js'

await describe('B08 - Get Base Report', async () => {
  const mockChargingStation = createChargingStationWithEvses({
    baseName: TEST_CHARGING_STATION_NAME,
    heartbeatInterval: Constants.DEFAULT_HEARTBEAT_INTERVAL,
    stationInfo: {
      chargePointModel: TEST_CHARGE_POINT_MODEL,
      chargePointSerialNumber: TEST_CHARGE_POINT_SERIAL_NUMBER,
      chargePointVendor: TEST_CHARGE_POINT_VENDOR,
      firmwareVersion: TEST_FIRMWARE_VERSION,
      ocppStrictCompliance: false,
    },
    websocketPingInterval: Constants.DEFAULT_WEBSOCKET_PING_INTERVAL,
  })

  const incomingRequestService = new OCPP20IncomingRequestService()

  // FR: B08.FR.01
  await it('Should handle GetBaseReport request with ConfigurationInventory', () => {
    const request: OCPP20GetBaseReportRequest = {
      reportBase: ReportBaseEnumType.ConfigurationInventory,
      requestId: 1,
    }

    const response = (incomingRequestService as any).handleRequestGetBaseReport(
      mockChargingStation,
      request
    )

    expect(response).toBeDefined()
    expect(response.status).toBe(GenericDeviceModelStatusEnumType.Accepted)
  })

  // FR: B08.FR.02
  await it('Should handle GetBaseReport request with FullInventory', () => {
    const request: OCPP20GetBaseReportRequest = {
      reportBase: ReportBaseEnumType.FullInventory,
      requestId: 2,
    }

    const response = (incomingRequestService as any).handleRequestGetBaseReport(
      mockChargingStation,
      request
    )

    expect(response).toBeDefined()
    expect(response.status).toBe(GenericDeviceModelStatusEnumType.Accepted)
  })

  await it('Should include registry variables with Actual attribute only for unsupported types', () => {
    const reportData: ReportDataType[] = (incomingRequestService as any).buildReportData(
      mockChargingStation,
      ReportBaseEnumType.FullInventory
    )
    const heartbeatEntry = reportData.find(
      (item: ReportDataType) =>
        item.variable.name === (OCPP20OptionalVariableName.HeartbeatInterval as string) &&
        item.component.name === (OCPP20ComponentName.OCPPCommCtrlr as string)
    )
    expect(heartbeatEntry).toBeDefined()
    if (heartbeatEntry) {
      const types =
        heartbeatEntry.variableAttribute?.map((a: { type?: string; value?: string }) => a.type) ??
        []
      expect(types).toEqual([AttributeEnumType.Actual])
    }
    // Boolean variable (AuthorizeRemoteStart) should only include Actual
    const authorizeRemoteStartEntry = reportData.find(
      (item: ReportDataType) =>
        item.variable.name === (OCPP20RequiredVariableName.AuthorizeRemoteStart as string) &&
        item.component.name === (OCPP20ComponentName.AuthCtrlr as string)
    )
    expect(authorizeRemoteStartEntry).toBeDefined()
    if (authorizeRemoteStartEntry) {
      const types =
        authorizeRemoteStartEntry.variableAttribute?.map(
          (a: { type?: string; value?: string }) => a.type
        ) ?? []
      expect(types).toEqual([AttributeEnumType.Actual])
    }
  })

  // FR: B08.FR.03
  await it('Should handle GetBaseReport request with SummaryInventory', () => {
    const request: OCPP20GetBaseReportRequest = {
      reportBase: ReportBaseEnumType.SummaryInventory,
      requestId: 3,
    }

    const response = (incomingRequestService as any).handleRequestGetBaseReport(
      mockChargingStation,
      request
    )

    expect(response).toBeDefined()
    expect(response.status).toBe(GenericDeviceModelStatusEnumType.Accepted)
  })

  // FR: B08.FR.04
  await it('Should return NotSupported for unsupported reportBase', () => {
    const request: OCPP20GetBaseReportRequest = {
      reportBase: 'UnsupportedReportBase' as unknown as ReportBaseEnumType,
      requestId: 4,
    }

    const response = (incomingRequestService as any).handleRequestGetBaseReport(
      mockChargingStation,
      request
    )

    expect(response).toBeDefined()
    expect(response.status).toBe(GenericDeviceModelStatusEnumType.NotSupported)
  })

  // FR: B08.FR.05
  await it('Should return EmptyResultSet when no data is available', () => {
    // Create a charging station with minimal configuration
    const minimalChargingStation = createChargingStationWithEvses({
      baseName: 'CS-MINIMAL',
      ocppConfiguration: {
        configurationKey: [],
      },
      stationInfo: {
        ocppStrictCompliance: false,
      },
    })

    const request: OCPP20GetBaseReportRequest = {
      reportBase: ReportBaseEnumType.ConfigurationInventory,
      requestId: 5,
    }

    const response = (incomingRequestService as any).handleRequestGetBaseReport(
      minimalChargingStation,
      request
    )

    expect(response).toBeDefined()
    expect(response.status).toBe(GenericDeviceModelStatusEnumType.EmptyResultSet)
  })

  // FR: B08.FR.06
  await it('Should build correct report data for ConfigurationInventory', () => {
    const request: OCPP20GetBaseReportRequest = {
      reportBase: ReportBaseEnumType.ConfigurationInventory,
      requestId: 6,
    }

    // Test the buildReportData method indirectly by calling handleRequestGetBaseReport
    // and checking if it returns Accepted status (which means data was built successfully)
    const response = (incomingRequestService as any).handleRequestGetBaseReport(
      mockChargingStation,
      request
    )

    expect(response).toBeDefined()
    expect(response.status).toBe(GenericDeviceModelStatusEnumType.Accepted)

    // We can also test the buildReportData method directly if needed
    const reportData: ReportDataType[] = (incomingRequestService as any).buildReportData(
      mockChargingStation,
      ReportBaseEnumType.ConfigurationInventory
    )

    expect(Array.isArray(reportData)).toBe(true)
    expect(reportData.length).toBeGreaterThan(0)

    // Check that each report data item has the expected structure
    for (const item of reportData) {
      expect(item.component).toBeDefined()
      expect(item.component.name).toBeDefined()
      expect(item.variable).toBeDefined()
      expect(item.variable.name).toBeDefined()
      expect(item.variableAttribute).toBeDefined()
      expect(Array.isArray(item.variableAttribute)).toBe(true)
      expect(item.variableCharacteristics).toBeDefined()
    }
  })

  // FR: B08.FR.07
  await it('Should build correct report data for FullInventory with station info', () => {
    const reportData: ReportDataType[] = (incomingRequestService as any).buildReportData(
      mockChargingStation,
      ReportBaseEnumType.FullInventory
    )

    expect(Array.isArray(reportData)).toBe(true)
    expect(reportData.length).toBeGreaterThan(0)

    // Check for station info variables
    const modelVariable = reportData.find(
      (item: ReportDataType) =>
        item.variable.name === (OCPP20DeviceInfoVariableName.Model as string) &&
        item.component.name === (OCPP20ComponentName.ChargingStation as string)
    )
    expect(modelVariable).toBeDefined()
    if (modelVariable) {
      expect(modelVariable.variableAttribute?.[0]?.value).toBe(TEST_CHARGE_POINT_MODEL)
    }

    const vendorVariable = reportData.find(
      (item: ReportDataType) =>
        item.variable.name === (OCPP20DeviceInfoVariableName.VendorName as string) &&
        item.component.name === (OCPP20ComponentName.ChargingStation as string)
    )
    expect(vendorVariable).toBeDefined()
    if (vendorVariable) {
      expect(vendorVariable.variableAttribute?.[0]?.value).toBe(TEST_CHARGE_POINT_VENDOR)
    }
  })

  // FR: B08.FR.08
  await it('Should build correct report data for SummaryInventory', () => {
    const reportData: ReportDataType[] = (incomingRequestService as any).buildReportData(
      mockChargingStation,
      ReportBaseEnumType.SummaryInventory
    )

    expect(Array.isArray(reportData)).toBe(true)
    expect(reportData.length).toBeGreaterThan(0)

    // Check for availability state variable
    const availabilityVariable = reportData.find(
      (item: ReportDataType) =>
        item.variable.name === (OCPP20DeviceInfoVariableName.AvailabilityState as string) &&
        item.component.name === (OCPP20ComponentName.ChargingStation as string)
    )
    expect(availabilityVariable).toBeDefined()
    if (availabilityVariable) {
      expect(availabilityVariable.variableCharacteristics?.supportsMonitoring).toBe(true)
    }
  })

  // ReportingValueSize truncation test
  await it('Should truncate long SequenceList/MemberList values per ReportingValueSize', () => {
    // Ensure ReportingValueSize is at a small value (default is Constants.OCPP_VALUE_ABSOLUTE_MAX_LENGTH). We will override configuration key if absent.
    const reportingSizeKey = StandardParametersKey.ReportingValueSize
    // Add or lower configuration key to 10 to force truncation
    addConfigurationKey(mockChargingStation, reportingSizeKey, '10', undefined, {
      overwrite: true,
    })
    setConfigurationKeyValue(mockChargingStation, reportingSizeKey, '10')

    // Choose TimeSource (SequenceList) and construct an artificially long ordered list value > 10 chars
    const variableManager = OCPP20VariableManager.getInstance()
    // Use members exceeding 10 chars total; exclude removed RTC/Manual.
    const longValue = 'Heartbeat,NTP,GPS,RealTimeClock,MobileNetwork,RadioTimeTransmitter'
    // Set Actual (SequenceList). Should accept full value internally.
    const setResult: OCPP20SetVariableResultType[] = variableManager.setVariables(
      mockChargingStation,
      [
        {
          attributeType: AttributeEnumType.Actual,
          attributeValue: longValue,
          component: { name: OCPP20ComponentName.ClockCtrlr },
          variable: { name: OCPP20RequiredVariableName.TimeSource },
        },
      ]
    )
    expect(setResult[0].attributeStatus).toBe('Accepted')

    // Build report; value should be truncated to length 10
    const reportData: ReportDataType[] = (incomingRequestService as any).buildReportData(
      mockChargingStation,
      ReportBaseEnumType.FullInventory
    )
    const timeSourceEntry = reportData.find(
      (item: ReportDataType) =>
        item.variable.name === (OCPP20RequiredVariableName.TimeSource as string) &&
        item.component.name === (OCPP20ComponentName.ClockCtrlr as string)
    )
    expect(timeSourceEntry).toBeDefined()
    if (timeSourceEntry) {
      const reportedAttr = timeSourceEntry.variableAttribute?.find(
        (a: { type?: string; value?: string }) => a.type === AttributeEnumType.Actual
      )
      expect(reportedAttr).toBeDefined()
      if (reportedAttr && typeof reportedAttr.value === 'string') {
        expect(reportedAttr.value.length).toBe(10)
        expect(longValue.startsWith(reportedAttr.value)).toBe(true)
      }
    }
  })

  // FR: B08.FR.09
  await it('Should handle GetBaseReport with EVSE structure', () => {
    // The createChargingStationWithEvses should create a station with EVSEs
    const stationWithEvses = createChargingStationWithEvses({
      baseName: 'CS-EVSE-001',
      hasEvses: true,
      stationInfo: {
        chargePointModel: 'EVSE Test Model',
        chargePointVendor: 'EVSE Test Vendor',
        ocppStrictCompliance: false,
      },
    })

    const reportData: ReportDataType[] = (incomingRequestService as any).buildReportData(
      stationWithEvses,
      ReportBaseEnumType.FullInventory
    )

    expect(Array.isArray(reportData)).toBe(true)
    expect(reportData.length).toBeGreaterThan(0)

    // Check if EVSE components are included when EVSEs exist
    const evseComponents = reportData.filter(
      (item: ReportDataType) => item.component.name === (OCPP20ComponentName.EVSE as string)
    )
    if (stationWithEvses.evses.size > 0) {
      expect(evseComponents.length).toBeGreaterThan(0)
    }
  })

  // FR: B08.FR.10
  await it('Should validate unsupported reportBase correctly', () => {
    const reportData: ReportDataType[] = (incomingRequestService as any).buildReportData(
      mockChargingStation,
      'InvalidReportBase' as unknown as ReportBaseEnumType
    )

    expect(Array.isArray(reportData)).toBe(true)
    expect(reportData.length).toBe(0)
  })
})
