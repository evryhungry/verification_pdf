package org.capsc.pdf.document.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AssignDocumentRequest {
    UUID userId;
    String role;
}
