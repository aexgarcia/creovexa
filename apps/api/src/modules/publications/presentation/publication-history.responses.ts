import { ApiProperty } from '@nestjs/swagger';
import { PaginationResponse } from '#app/presentation/http/pagination.dto';
class HistoryPublicationResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) campaignId!: string;
  @ApiProperty({ type: String }) campaignTitle!: string;
  @ApiProperty({ type: String }) platform!: string;
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: String }) socialAccountId!: string;
  @ApiProperty({ type: String, nullable: true }) failureCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) externalPostId!: string | null;
  @ApiProperty({ type: String, nullable: true }) publishedAt!: string | null;
  @ApiProperty({ type: String }) createdAt!: string;
}
class AttemptResultResponse {
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: String, nullable: true }) failureCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) externalPostId!: string | null;
  @ApiProperty({ type: String }) recordedAt!: string;
}
class HistoryAttemptResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: Number }) number!: number;
  @ApiProperty({ type: String }) startedAt!: string;
  @ApiProperty({ type: AttemptResultResponse, nullable: true })
  result!: AttemptResultResponse | null;
}
export class PublicationHistoryPage {
  @ApiProperty({ type: [HistoryPublicationResponse] }) data!: HistoryPublicationResponse[];
  @ApiProperty({ type: PaginationResponse }) meta!: PaginationResponse;
}
export class PublicationAttemptPage {
  @ApiProperty({ type: [HistoryAttemptResponse] }) data!: HistoryAttemptResponse[];
  @ApiProperty({ type: PaginationResponse }) meta!: PaginationResponse;
}
