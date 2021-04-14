/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

// eslint-disable-next-line no-shadow
enum NmsServiceType {
  Invalid = -1,
  None = 0,
  Read = 1,
  Write = 2,
  InformationReport = 3,
  EventNotification = 4,
  AckEventNotification = 5,
  AlterEventConditionMonitoring = 6,
  RequestDomainUpload = 7,
  InitiateUploadSequence = 8,
  UploadSegment = 9,
  RequestDomainDownload = 10,
  InitiateDownloadSequence = 11,
  DownloadSegment = 12,
  TerminateDownloadSequence = 13,
  VerifyDomainChecksum = 14,
  ExecuteProgramInvocation = 15,
  StartProgramInvocation = 16,
  Stop = 17,
  Resume = 18,
  Reset = 19,
  Shutdown = 20,
}

export default NmsServiceType;
