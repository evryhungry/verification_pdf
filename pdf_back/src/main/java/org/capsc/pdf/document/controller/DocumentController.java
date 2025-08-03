package org.capsc.pdf.document.controller;

import lombok.RequiredArgsConstructor;
import org.capsc.pdf.document.dto.AssignDocumentRequest;
import org.capsc.pdf.document.dto.CreateDocumentRequest;
import org.capsc.pdf.document.dto.DocumentSaveRequest;
import org.capsc.pdf.document.dto.DocumentWithTemplateResponse;
import org.capsc.pdf.document.entity.Document;
import org.capsc.pdf.document.service.DocumentService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller("/api/documents")
@RequiredArgsConstructor
public class DocumentController {
    private final DocumentService documentService;

    @PostMapping
    public ResponseEntity<Document> createDocument(@RequestBody CreateDocumentRequest request) {
        return ResponseEntity.ok(documentService.createDocumentFromTemplate(request));
    }

    @PostMapping("/{documentId}")
    public ResponseEntity<Void> assignRoleToUser(@PathVariable Long documentId, @RequestBody AssignDocumentRequest request) {
        documentService.assignRoleToUser(documentId, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/documents/{id}/with-template")
    public ResponseEntity<DocumentWithTemplateResponse> getDocumentWithTemplate(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.getDocumentWithTemplate(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Document> saveDataOfDocument(@RequestBody DocumentSaveRequest request, @PathVariable Long id) {
        Document saved = documentService.saveDataOfDocument(request, id);
        return ResponseEntity.ok(saved);
    }
}
