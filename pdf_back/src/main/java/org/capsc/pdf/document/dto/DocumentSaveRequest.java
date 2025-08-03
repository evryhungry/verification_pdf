package org.capsc.pdf.document.dto;

import lombok.Getter;
import lombok.Setter;
import org.capsc.pdf.document.entity.Document.DocumentStatus;

import java.time.LocalDateTime;

@Getter
@Setter
public class DocumentSaveRequest {
    private String data; // JSON 형태 문자열
}