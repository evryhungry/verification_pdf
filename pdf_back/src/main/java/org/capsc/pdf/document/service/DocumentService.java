package org.capsc.pdf.document.service;

import org.capsc.pdf.document.dto.AssignDocumentRequest;
import org.capsc.pdf.document.dto.CreateDocumentRequest;
import org.capsc.pdf.document.dto.DocumentSaveRequest;
import org.capsc.pdf.document.dto.DocumentWithTemplateResponse;
import org.capsc.pdf.document.entity.Document;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

public interface DocumentService {
    Document createDocumentFromTemplate(CreateDocumentRequest request);
    @Transactional
    void assignRoleToUser(Long documentId, AssignDocumentRequest request);
    DocumentWithTemplateResponse getDocumentWithTemplate(Long id);
    Document saveDataOfDocument(DocumentSaveRequest request, Long documentId);
}