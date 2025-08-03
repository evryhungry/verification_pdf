package org.capsc.pdf.document.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class CreateDocumentRequest {
    private Long templateId;
    private UUID creatorId;
    private String content;
}