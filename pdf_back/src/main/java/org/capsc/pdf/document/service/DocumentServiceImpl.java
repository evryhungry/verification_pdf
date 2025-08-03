package org.capsc.pdf.document.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import lombok.RequiredArgsConstructor;
import org.capsc.pdf.document.dto.AssignDocumentRequest;
import org.capsc.pdf.document.dto.CreateDocumentRequest;
import org.capsc.pdf.document.dto.DocumentSaveRequest;
import org.capsc.pdf.document.dto.DocumentWithTemplateResponse;
import org.capsc.pdf.document.entity.Document;
import org.capsc.pdf.document.entity.DocumentRole;
import org.capsc.pdf.document.repository.DocumentRepository;
import org.capsc.pdf.document.repository.DocumentRoleRepository;
import org.capsc.pdf.template.entity.Template;
import org.capsc.pdf.template.repository.TemplateRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;

@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final TemplateRepository templateRepository;
    private final DocumentRepository documentRepository;
    private final DocumentRoleRepository documentRoleRepository;
    private final ObjectMapper objectMapper;

    @Value("${file.upload.image-path}")
    private String imagePrefix;

    @Value("${file.upload.pdf-path}")
    private String pdfPrefix;


    @Override
    @Transactional
    public Document createDocumentFromTemplate(CreateDocumentRequest request) {
        Template template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 템플릿"));

        Document document = Document.builder()
                .templateId(request.getTemplateId())
                .status(Document.DocumentStatus.EDITING)
                .build();

        Document savedDoc = documentRepository.save(document);

        DocumentRole creatorRole = DocumentRole.builder()
                .documentId(savedDoc.getId())
                .assignedUserId(request.getCreatorId())
                .taskRole(DocumentRole.TaskRole.CREATOR)
                .build();

        documentRoleRepository.save(creatorRole);

        return savedDoc;
    }

    // userId 부분을 email 로 바꾸면 가능할 듯
    @Transactional
    @Override
    public void assignRoleToUser(Long documentId, AssignDocumentRequest request) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 문서"));

        DocumentRole.TaskRole roleType = DocumentRole.TaskRole.valueOf(request.getRole().toUpperCase());

        DocumentRole newRole = DocumentRole.builder()
                .documentId(documentId)
                .assignedUserId(request.getUserId())
                .taskRole(roleType)
                .build();

        documentRoleRepository.save(newRole);
    }

    @Override
    public DocumentWithTemplateResponse getDocumentWithTemplate(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("문서를 찾을 수 없습니다."));

        Template template = templateRepository.findById(document.getTemplateId())
                .orElseThrow(() -> new RuntimeException("템플릿을 찾을 수 없습니다."));

        String pdfUrl = pdfPrefix + new File(template.getPdfFilePath()).getName();
        String imageUrl = imagePrefix + new File(template.getPdfImagePath()).getName();

        return DocumentWithTemplateResponse.builder()
                .document(document)
                .templateName(template.getName())
                .pdfUrl(pdfUrl)
                .imageUrl(imageUrl)
                .build();
    }

    @Override
    public Document saveDataOfDocument(DocumentSaveRequest request, Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("문서를 찾을 수 없습니다."));

        try {
            document.setData(objectMapper.writeValueAsString(request.getData()));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("JSON 직렬화 실패", e);
        }

        return documentRepository.save(document);
    }
}